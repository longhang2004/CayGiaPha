package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.service.CanonicalRelation.BranchOrder;
import com.caygiapha.familytree.service.CanonicalRelation.Side;
import com.caygiapha.familytree.service.CanonicalResolution.Status;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.IntStream;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based tests for the totality of {@link KinshipResolver#resolveCanonical} (design:
 * <em>Kinship_Resolver Algorithm — Steps 2 &amp; 3</em>).
 *
 * <p>Feature: vietnamese-family-tree, Property 10
 *
 * <p><strong>Property 10: Resolver totality</strong> — for <em>any</em> tree graph and <em>any</em>
 * ordered pair {@code (ego, target)}, {@code resolveCanonical} returns a non-null
 * {@link CanonicalResolution} that is either {@link Status#RESOLVED} (carrying a non-null,
 * self-consistent {@link CanonicalRelation}) or one of the explicit unresolved indicators
 * ({@link Status#UNRESOLVED_NO_PATH} / {@link Status#UNRESOLVED_INDETERMINATE_ORDER}) — and it
 * never throws.
 *
 * <p>The generator builds arbitrary graphs over a pool of person nodes with random or absent
 * gender, birth order, and birth year, connected by a random set of edges of <em>all</em> edge
 * types (father/mother bloodline, marriage, non-bloodline, asserted) — including malformed/odd
 * combinations such as multiple parents and would-be cycles in the raw edge list. It then resolves
 * arbitrary ordered pairs, including ids not present in the graph and {@code ego == target}, backed
 * by a person-lookup that returns {@code null} for unknown ids.
 *
 * <p><strong>Validates: Requirements 5.4, 8.7, 10.1, 10.3</strong>
 */
class ResolverTotalityProperties {

    private static final UUID TREE_ID = new UUID(10L, 10L);

    private final KinshipResolver resolver = new KinshipResolver();

    /** A generated edge: a type plus source/target indices into the node pool. */
    private record EdgeDesc(String type, int src, int tgt) {}

    /** Attributes of a generated person (any of which may be absent / odd). */
    private record PersonDesc(String gender, Integer birthOrder, Integer birthYear) {}

    /**
     * A complete generated scenario: the real node pool with its person attributes, an arbitrary
     * edge set over the pool, and an ordered (ego, target) pair chosen from an extended pool that
     * also contains phantom ids never present in the graph.
     */
    private record Scenario(
            List<UUID> pool,
            List<PersonDesc> personDescs,
            List<EdgeDesc> edges,
            UUID ego,
            UUID target) {

        Map<UUID, Person> people() {
            Map<UUID, Person> map = new HashMap<>();
            for (int i = 0; i < pool.size(); i++) {
                PersonDesc d = personDescs.get(i);
                Person p = new Person(TREE_ID, "P" + i, d.gender());
                p.setBirthOrder(d.birthOrder());
                p.setBirthYear(d.birthYear());
                map.put(pool.get(i), p);
            }
            return map;
        }

        List<Relationship> relationships() {
            List<Relationship> rels = new ArrayList<>(edges.size());
            for (EdgeDesc e : edges) {
                Relationship r =
                        new Relationship(TREE_ID, e.type(), pool.get(e.src()), pool.get(e.tgt()));
                switch (e.type()) {
                    case RelationshipService.TYPE_MARRIAGE -> r.setMaritalStatus("married");
                    case RelationshipService.TYPE_NON_BLOODLINE -> r.setSocialType("friend");
                    case RelationshipService.TYPE_ASSERTED -> r.setAssertedLabel("bác");
                    default -> {
                        // bloodline edges carry no type-specific payload
                    }
                }
                rels.add(r);
            }
            return rels;
        }
    }

    @Provide
    Arbitrary<Scenario> scenarios() {
        Arbitrary<Integer> poolSize = Arbitraries.integers().between(2, 8);

        return poolSize.flatMap(size -> {
            // Stable, distinct ids for the real pool.
            List<UUID> pool = IntStream.range(0, size).mapToObj(i -> new UUID(0L, i)).toList();

            // Phantom ids that are never in the people map nor referenced by any edge; selecting
            // these as ego/target exercises the "id not present in the graph" path.
            int phantomCount = 2;
            List<UUID> extended = new ArrayList<>(pool);
            IntStream.range(0, phantomCount).forEach(i -> extended.add(new UUID(99L, i)));

            Arbitrary<List<PersonDesc>> personDescs = personDesc().list().ofSize(size);
            Arbitrary<List<EdgeDesc>> edges = edgeDesc(size).list().ofMaxSize(3 * size);
            Arbitrary<Integer> egoIdx = Arbitraries.integers().between(0, extended.size() - 1);
            Arbitrary<Integer> targetIdx = Arbitraries.integers().between(0, extended.size() - 1);

            return Combinators.combine(personDescs, edges, egoIdx, targetIdx)
                    .as((descs, es, ei, ti) ->
                            new Scenario(pool, descs, es, extended.get(ei), extended.get(ti)));
        });
    }

    /** Gender is random or absent/odd; birth order and birth year are small or absent so that */
    /* both well-ordered branches and indeterminate (equal/absent) branches are exercised. */
    private Arbitrary<PersonDesc> personDesc() {
        Arbitrary<String> gender =
                Arbitraries.of("male", "female", "Male", "FEMALE", "other", "", null);
        Arbitrary<Integer> birthOrder = Arbitraries.of(null, 1, 2, 3);
        Arbitrary<Integer> birthYear = Arbitraries.of(null, 1950, 1960, 1970);
        return Combinators.combine(gender, birthOrder, birthYear).as(PersonDesc::new);
    }

    /** Edges span every type; self-pointing edges are filtered (matching the stored-data contract). */
    private Arbitrary<EdgeDesc> edgeDesc(int size) {
        Arbitrary<String> types = Arbitraries.of(
                RelationshipService.TYPE_BLOODLINE_FATHER,
                RelationshipService.TYPE_BLOODLINE_MOTHER,
                RelationshipService.TYPE_MARRIAGE,
                RelationshipService.TYPE_NON_BLOODLINE,
                RelationshipService.TYPE_ASSERTED);
        Arbitrary<Integer> idx = Arbitraries.integers().between(0, size - 1);
        return Combinators.combine(types, idx, idx)
                .as(EdgeDesc::new)
                .filter(e -> e.src() != e.tgt());
    }

    /**
     * Feature: vietnamese-family-tree, Property 10
     *
     * <p>For any generated graph and ordered pair, the resolver returns a defined, self-consistent
     * resolution and never throws.
     */
    @Property(tries = 200)
    void resolverIsTotalAndNeverThrows(@ForAll("scenarios") Scenario scenario) {
        KinshipGraphProjection projection =
                KinshipGraphProjection.fromEdges(TREE_ID, scenario.relationships());
        Map<UUID, Person> people = scenario.people();
        Function<UUID, Person> lookup = people::get; // returns null for unknown / phantom ids

        CanonicalResolution[] holder = new CanonicalResolution[1];
        assertThatCode(() -> holder[0] =
                        resolver.resolveCanonical(projection, scenario.ego(), scenario.target(), lookup))
                .as("resolver must never throw for ego=%s target=%s", scenario.ego(), scenario.target())
                .doesNotThrowAnyException();

        assertTotalAndConsistent(holder[0]);
    }

    /**
     * A defined resolution is non-null with a non-null status that is exactly one of the three
     * defined outcomes; a RESOLVED result carries a self-consistent descriptor while an unresolved
     * result carries none.
     */
    private void assertTotalAndConsistent(CanonicalResolution result) {
        assertThat(result).as("resolution is never null").isNotNull();
        assertThat(result.status()).as("status is always defined").isNotNull();
        assertThat(result.status())
                .isIn(
                        Status.RESOLVED,
                        Status.UNRESOLVED_NO_PATH,
                        Status.UNRESOLVED_INDETERMINATE_ORDER);

        if (result.status() == Status.RESOLVED) {
            assertThat(result.isResolved()).isTrue();
            CanonicalRelation r = result.relation();
            assertThat(r).as("RESOLVED carries a non-null relation").isNotNull();
            assertThat(result.canonicalRelation()).contains(r);

            // Self-consistent descriptor fields.
            assertThat(r.upCount()).as("upCount is non-negative").isGreaterThanOrEqualTo(0);
            assertThat(r.downCount()).as("downCount is non-negative").isGreaterThanOrEqualTo(0);
            assertThat(r.side()).as("side is defined").isNotNull();
            assertThat(r.targetGender()).as("targetGender is defined").isNotNull();
            assertThat(r.branchOrder()).as("branchOrder is defined").isNotNull();

            // A RESOLVED relation is never left in the UNKNOWN order state — that maps to the
            // explicit indeterminate-order indicator instead. (8.5)
            assertThat(r.branchOrder()).isNotEqualTo(BranchOrder.UNKNOWN);

            // A sibling branch (up and down legs) must carry a decided elder/younger order; any
            // direct lineage / spouse / self relation must be SELF order.
            if (r.hasSiblingBranch()) {
                assertThat(r.branchOrder()).isIn(BranchOrder.ELDER, BranchOrder.YOUNGER);
            } else {
                assertThat(r.branchOrder()).isEqualTo(BranchOrder.SELF);
            }

            // Side is SELF exactly when ego does not step up toward the target's lineage.
            if (r.upCount() == 0) {
                assertThat(r.side()).isEqualTo(Side.SELF);
            } else {
                assertThat(r.side()).isIn(Side.PATERNAL, Side.MATERNAL);
            }

            // The region-lookup seam is always producible and never throws.
            assertThat(r.canonicalKey()).isNotNull();
        } else {
            assertThat(result.isUnresolved()).isTrue();
            assertThat(result.relation()).as("unresolved carries no relation").isNull();
            assertThat(result.canonicalRelation()).isEmpty();
        }
    }
}
