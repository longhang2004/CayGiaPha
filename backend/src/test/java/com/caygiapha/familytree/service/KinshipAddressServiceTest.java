package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.service.AddressResolution.Status;
import com.caygiapha.familytree.service.KinshipAddressService.RegionTermLookup;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link KinshipAddressService} covering the region-term lookup and the
 * address-symmetry mechanism (design: <em>Kinship_Resolver Algorithm — Step 4</em> and
 * <em>Symmetry</em>; Requirements 8.6, 9.3, 9.4).
 *
 * <p>Each test builds a small in-memory family, projects it with {@link KinshipGraphProjection},
 * and resolves the region-aware form of address through the service's I/O-free core
 * {@link KinshipAddressService#resolve}, backed by an in-memory {@link RegionTermLookup} that stands
 * in for the {@code region_kinship_terms} table (seeding real Bắc/Trung/Nam data is task 3.9).
 *
 * <p>Covers: term found (9.3), undefined-for-region (9.4), unresolved passthrough — both no-path and
 * indeterminate order (8.7, 8.5), and a descendant/ascendant symmetry example (8.6).
 */
class KinshipAddressServiceTest {

    private static final UUID TREE_ID = UUID.randomUUID();
    private static final String REGION = "Bac";

    private final KinshipResolver resolver = new KinshipResolver();
    private final KinshipAddressService service =
            new KinshipAddressService(resolver, null, null, null, null, null);

    private final Map<UUID, Person> people = new HashMap<>();
    private final List<Relationship> edges = new ArrayList<>();

    // A three-generation paternal line plus a paternal uncle and a descendant.
    private final UUID gf = person("male", 1, 1940); // grandfather
    private final UUID father = person("male", 2, 1970); // ego's father
    private final UUID uncleElder = person("male", 1, 1965); // father's elder brother -> bác
    private final UUID ego = person("male", 2, 1995);
    private final UUID child = person("female", 1, 2020); // ego's daughter

    // An isolated person (separate component) for the no-path case.
    private final UUID stranger = person("male", 1, 1990);

    // A paternal uncle with no birth data -> elder/younger indeterminate at the branch.
    private final UUID uncleUnknown = person("male", null, null);

    // A region-term table seeded with exactly the canonical keys exercised below.
    private final Map<String, String> bacTerms = new HashMap<>();
    private final RegionTermLookup termLookup =
            (region, key) -> Optional.ofNullable(REGION.equals(region) ? bacTerms.get(key) : null);

    KinshipAddressServiceTest() {
        father(gf, father);
        father(gf, uncleElder);
        father(gf, uncleUnknown);
        father(father, ego);
        father(ego, child);
        // `stranger` participates in no edge -> not in the projection -> unreachable.

        // Seed the four keys this test relies on (kept minimal; full seeding is task 3.9).
        bacTerms.put("u2:d1:PATERNAL:MALE:ELDER:s0", "bác"); // ego -> paternal elder uncle
        bacTerms.put("u2:d0:PATERNAL:MALE:SELF:s0", "ông"); // ego -> grandfather (ascendant)
        bacTerms.put("u0:d2:SELF:MALE:SELF:s0", "cháu"); // grandfather -> ego (descendant)
    }

    private AddressResolution resolve(UUID from, UUID to) {
        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(TREE_ID, edges);
        return service.resolve(REGION, projection, from, to, people::get, termLookup);
    }

    @Test
    void returnsTheRegionTermWhenDefined() {
        AddressResolution result = resolve(ego, uncleElder);
        assertThat(result.status()).isEqualTo(Status.RESOLVED);
        assertThat(result.term()).isEqualTo("bác");
        assertThat(result.formOfAddress()).contains("bác");
        // The lookup key is exactly the canonical seam asserted by the resolver tests.
        assertThat(result.canonical().relation().canonicalKey())
                .isEqualTo("u2:d1:PATERNAL:MALE:ELDER:s0");
    }

    @Test
    void returnsUndefinedForRegionWhenNoTermRowExists() {
        // ego -> child is a resolvable descendant relation, but its key is intentionally unseeded.
        AddressResolution result = resolve(ego, child);
        assertThat(result.status()).isEqualTo(Status.UNDEFINED_FOR_REGION);
        assertThat(result.term()).isNull();
        assertThat(result.canonical().isResolved()).isTrue();
        assertThat(bacTerms).doesNotContainKey(result.canonical().relation().canonicalKey());
    }

    @Test
    void passesThroughUnresolvedWhenNoPath() {
        AddressResolution result = resolve(ego, stranger);
        assertThat(result.status()).isEqualTo(Status.UNRESOLVED);
        assertThat(result.term()).isNull();
        assertThat(result.canonical().status())
                .isEqualTo(CanonicalResolution.Status.UNRESOLVED_NO_PATH);
    }

    @Test
    void passesThroughUnresolvedWhenOrderIndeterminate() {
        AddressResolution result = resolve(ego, uncleUnknown);
        assertThat(result.status()).isEqualTo(Status.UNRESOLVED);
        assertThat(result.term()).isNull();
        assertThat(result.canonical().status())
                .isEqualTo(CanonicalResolution.Status.UNRESOLVED_INDETERMINATE_ORDER);
    }

    @Test
    void descendantAndAscendantTermsAreInverseUnderSymmetry() {
        // ego addresses the grandfather with the ascendant term (ông) ...
        AddressResolution egoToGrandparent = resolve(ego, gf);
        assertThat(egoToGrandparent.status()).isEqualTo(Status.RESOLVED);
        assertThat(egoToGrandparent.term()).isEqualTo("ông");

        // ... and the grandfather addresses ego with the corresponding descendant term (cháu).
        AddressResolution grandparentToEgo = resolve(gf, ego);
        assertThat(grandparentToEgo.status()).isEqualTo(Status.RESOLVED);
        assertThat(grandparentToEgo.term()).isEqualTo("cháu");

        // The reversed path yields a distinct canonical key (up/down counts swapped), which is what
        // structurally guarantees the inverse-term symmetry (8.6).
        String forwardKey = egoToGrandparent.canonical().relation().canonicalKey();
        String reverseKey = grandparentToEgo.canonical().relation().canonicalKey();
        assertThat(forwardKey).isEqualTo("u2:d0:PATERNAL:MALE:SELF:s0");
        assertThat(reverseKey).isEqualTo("u0:d2:SELF:MALE:SELF:s0");
        assertThat(forwardKey).isNotEqualTo(reverseKey);
    }

    // --- Fixture helpers ----------------------------------------------------------------------

    private UUID person(String gender, Integer birthOrder, Integer birthYear) {
        UUID id = UUID.randomUUID();
        Person p = new Person(TREE_ID, "P", gender);
        p.setBirthOrder(birthOrder);
        p.setBirthYear(birthYear);
        people.put(id, p);
        return id;
    }

    private void father(UUID parent, UUID childId) {
        edges.add(
                new Relationship(TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, parent, childId));
    }
}
