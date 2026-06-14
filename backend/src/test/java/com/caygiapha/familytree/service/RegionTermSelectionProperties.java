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
import java.util.function.Function;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.GenerationMode;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based test for region-aware term selection by the {@code Kinship_Resolver} (design:
 * <em>Kinship_Resolver Algorithm — Step 4, Look up the regional term</em>, and <em>Region as
 * configuration data</em>).
 *
 * <p>Feature: vietnamese-family-tree, Property 15
 *
 * <p><strong>Property 15: Region term selection</strong> — when the resolver computes a form of
 * address it selects the kinship term defined for the tree's <em>current</em> region (9.3); after a
 * region change, every subsequently requested form of address uses the <em>newly selected</em>
 * region's term (9.5).
 *
 * <p><strong>Strategy.</strong> A small fixed family is built that yields several distinct,
 * fully-derivable relations between an ego and a target (a paternal elder uncle, a paternal
 * grandfather addressed as an ascendant, the grandfather addressing the ego as a descendant, and
 * the ego addressing a child). An in-memory {@link RegionTermLookup} stands in for the
 * {@code region_kinship_terms} table and maps the <em>same</em> canonical key to a
 * <em>different</em> term in each region ({@code Bac}/{@code Trung}/{@code Nam}) by encoding the
 * region into the term ({@code region|key}). The test generates the tree's current region, a region
 * to change to, and which relation to resolve, exercising all three regions and multiple relations.
 *
 * <p>Because {@link KinshipAddressService#resolve} takes the region as a per-call parameter and
 * reads it for every resolution, resolving with one region argument models the current-region
 * behavior (9.3) and resolving again with a different region argument models the post-change
 * behavior (9.5): the returned term is the one seeded for that region, and switching regions changes
 * the returned term whenever the two regions differ.
 *
 * <p><strong>Validates: Requirements 9.3, 9.5</strong>
 */
class RegionTermSelectionProperties {

    private static final UUID TREE_ID = new UUID(15L, 15L);
    private static final List<String> REGIONS = List.of("Bac", "Trung", "Nam");

    private final KinshipResolver resolver = new KinshipResolver();
    private final KinshipAddressService service =
            new KinshipAddressService(resolver, null, null, null, null, null);

    // A fixed three-generation paternal family with a derivable relation between several pairs.
    private final Map<UUID, Person> people = new HashMap<>();
    private final List<Relationship> edges = new ArrayList<>();

    private final UUID gf = person("male", 1, 1940); // grandfather
    private final UUID father = person("male", 2, 1970); // ego's father
    private final UUID uncleElder = person("male", 1, 1965); // father's elder brother -> bác
    private final UUID ego = person("male", 2, 1995);
    private final UUID child = person("female", 1, 2020); // ego's daughter

    private final KinshipGraphProjection projection;

    RegionTermSelectionProperties() {
        father(gf, father);
        father(gf, uncleElder);
        father(father, ego);
        father(ego, child);
        projection = KinshipGraphProjection.fromEdges(TREE_ID, edges);
    }

    /** The ordered pairs that resolve to a defined canonical relation in this family. */
    private record RelationCase(String name, UUID from, UUID to) {}

    @Provide
    Arbitrary<RelationCase> relations() {
        return Arbitraries.of(
                new RelationCase("ego->paternal-elder-uncle", ego, uncleElder),
                new RelationCase("ego->grandfather (ascendant)", ego, gf),
                new RelationCase("grandfather->ego (descendant)", gf, ego),
                new RelationCase("ego->child (descendant)", ego, child));
    }

    @Provide
    Arbitrary<String> regions() {
        return Arbitraries.of(REGIONS);
    }

    /**
     * An inverse to the real {@code region_kinship_terms} table: the same canonical key resolves to
     * a distinct term per region by encoding the region into the term. Only the three valid regions
     * have rows; any other region key is undefined.
     */
    private static RegionTermLookup multiRegionTable() {
        return (region, key) ->
                REGIONS.contains(region) ? Optional.of(term(region, key)) : Optional.empty();
    }

    /** The seeded term for {@code (region, key)} — distinct across regions by construction. */
    private static String term(String region, String key) {
        return region + "|" + key;
    }

    /**
     * Feature: vietnamese-family-tree, Property 15
     *
     * <p>The resolver returns the term seeded for the tree's current region (9.3); resolving again
     * with a changed region argument returns the new region's term (9.5), and the two terms differ
     * exactly when the regions differ.
     *
     * <p><strong>Validates: Requirements 9.3, 9.5</strong>
     */
    @Property(tries = 300, generation = GenerationMode.RANDOMIZED)
    void resolverSelectsCurrentRegionTermAndFollowsRegionChange(
            @ForAll("regions") String currentRegion,
            @ForAll("regions") String newRegion,
            @ForAll("relations") RelationCase relation) {

        Function<UUID, Person> lookup = people::get;
        RegionTermLookup termLookup = multiRegionTable();

        // (9.3) Resolve under the tree's current region.
        AddressResolution current =
                service.resolve(currentRegion, projection, relation.from(), relation.to(), lookup,
                        termLookup);

        assertThat(current.status())
                .as("relation %s resolves under region %s", relation.name(), currentRegion)
                .isEqualTo(Status.RESOLVED);

        String key = current.canonical().relation().canonicalKey();

        // The selected term is exactly the one defined for the CURRENT region, not any other. (9.3)
        assertThat(current.term())
                .as("term for %s is the current region (%s) term", relation.name(), currentRegion)
                .isEqualTo(term(currentRegion, key));

        // (9.5) Simulate a region change: a subsequent resolution reads the new region.
        AddressResolution afterChange =
                service.resolve(newRegion, projection, relation.from(), relation.to(), lookup,
                        termLookup);

        assertThat(afterChange.status())
                .as("relation %s resolves under region %s after change", relation.name(), newRegion)
                .isEqualTo(Status.RESOLVED);

        // The canonical relation is unchanged by the region; only the looked-up term changes.
        assertThat(afterChange.canonical().relation().canonicalKey())
                .as("canonical key is region-independent")
                .isEqualTo(key);

        // After the change, the term is the NEW region's term. (9.5)
        assertThat(afterChange.term())
                .as("term after change uses the new region (%s)", newRegion)
                .isEqualTo(term(newRegion, key));

        // Changing the region changes the term iff the region actually changed.
        if (newRegion.equals(currentRegion)) {
            assertThat(afterChange.term()).isEqualTo(current.term());
        } else {
            assertThat(afterChange.term()).isNotEqualTo(current.term());
        }
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
