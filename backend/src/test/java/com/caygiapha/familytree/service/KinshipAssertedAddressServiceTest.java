package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.service.AddressResolution.Status;
import com.caygiapha.familytree.service.KinshipAddressService.AssertedLabelLookup;
import com.caygiapha.familytree.service.KinshipAddressService.RegionTermLookup;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the asserted-vs-derived address behavior added in task 4.1 (design:
 * <em>Asserted vs Derived Relationships — Storage and rendering</em>; Requirements 5.4, 6.4).
 *
 * <p>These exercise {@link KinshipAddressService#resolve(String, KinshipGraphProjection, UUID, UUID,
 * java.util.function.Function, RegionTermLookup, AssertedLabelLookup)} — the I/O-free core — with an
 * in-memory {@link AssertedLabelLookup} standing in for the {@code relationships} table, asserting:
 *
 * <ul>
 *   <li>a pair directly joined by an asserted edge returns the stored label verbatim (an
 *       {@link Status#ASSERTED} result), <strong>not</strong> a derived term; (6.4)</li>
 *   <li>a pair joined only by derived edges returns the derived region term; (5.4, 9.3)</li>
 *   <li>the asserted edge is never traversed to derive the address toward a third party — a person
 *       reachable from ego only <em>through</em> the asserted edge is unresolved. (6.4)</li>
 * </ul>
 */
class KinshipAssertedAddressServiceTest {

    private static final UUID TREE_ID = UUID.randomUUID();
    private static final String REGION = "Bac";

    private final KinshipResolver resolver = new KinshipResolver();
    private final KinshipAddressService service =
            new KinshipAddressService(resolver, null, null, null, null, null);

    private final Map<UUID, Person> people = new HashMap<>();
    private final List<Relationship> edges = new ArrayList<>();

    // A small paternal line: grandfather -> father -> ego, plus father's elder brother (a derived
    // paternal uncle -> bác).
    private final UUID gf = person("male", 1, 1940);
    private final UUID father = person("male", 2, 1970);
    private final UUID uncleElder = person("male", 1, 1965);
    private final UUID ego = person("male", 2, 1995);

    // An asserted "bác" whose connecting ancestors are NOT modeled: ego is joined to him only by an
    // asserted edge. The asserted uncle has a (derived) child, `cousin`.
    private final UUID assertedUncle = person("male", 1, 1960);
    private final UUID cousin = person("female", 1, 1990);

    private final Map<String, String> bacTerms = new HashMap<>();
    private final RegionTermLookup termLookup =
            (region, key) -> Optional.ofNullable(REGION.equals(region) ? bacTerms.get(key) : null);

    // In-memory stand-in for the direct-asserted-edge lookup: only the exact ordered pair
    // (ego -> assertedUncle) is joined by an asserted edge, labeled "bác".
    private final AssertedLabelLookup assertedLookup =
            (egoId, targetId) -> ego.equals(egoId) && assertedUncle.equals(targetId)
                    ? Optional.of("bác")
                    : Optional.empty();

    KinshipAssertedAddressServiceTest() {
        father(gf, father);
        father(gf, uncleElder);
        father(father, ego);
        // assertedUncle -> cousin is a real (derived) bloodline edge.
        father(assertedUncle, cousin);
        // The asserted edge ego -> assertedUncle is stored but excluded from the projection.
        asserted(ego, assertedUncle, "bác");

        // Derived term for ego's paternal elder uncle.
        bacTerms.put("u2:d1:PATERNAL:MALE:ELDER:s0", "bác");
    }

    private AddressResolution resolve(UUID from, UUID to) {
        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(TREE_ID, edges);
        return service.resolve(REGION, projection, from, to, people::get, termLookup, assertedLookup);
    }

    @Test
    void assertedPairReturnsTheStoredLabelVerbatim() {
        AddressResolution result = resolve(ego, assertedUncle);

        assertThat(result.status()).isEqualTo(Status.ASSERTED);
        assertThat(result.isAsserted()).isTrue();
        assertThat(result.term()).isEqualTo("bác");
        assertThat(result.formOfAddress()).contains("bác");
        // An asserted result is the stored label, not a derived path.
        assertThat(result.canonical()).isNull();
    }

    @Test
    void derivedOnlyPathReturnsTheDerivedRegionTerm() {
        AddressResolution result = resolve(ego, uncleElder);

        assertThat(result.status()).isEqualTo(Status.RESOLVED);
        assertThat(result.term()).isEqualTo("bác");
        assertThat(result.canonical().relation().canonicalKey())
                .isEqualTo("u2:d1:PATERNAL:MALE:ELDER:s0");
    }

    @Test
    void assertedEdgeIsNotTraversedToDeriveAThirdPartyAddress() {
        // `cousin` is reachable from ego ONLY through the asserted edge (ego -> assertedUncle ->
        // cousin). Since the asserted edge is excluded from the projection and the asserted lookup
        // matches only the (ego, assertedUncle) pair, ego -> cousin has no derived path. (6.4)
        AddressResolution result = resolve(ego, cousin);

        assertThat(result.status()).isEqualTo(Status.UNRESOLVED);
        assertThat(result.term()).isNull();
        assertThat(result.canonical().status())
                .isEqualTo(CanonicalResolution.Status.UNRESOLVED_NO_PATH);
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

    private void asserted(UUID source, UUID target, String label) {
        Relationship edge = new Relationship(TREE_ID, RelationshipService.TYPE_ASSERTED, source, target);
        edge.setAssertedLabel(label);
        edge.setDerivationState("asserted");
        edges.add(edge);
    }
}
