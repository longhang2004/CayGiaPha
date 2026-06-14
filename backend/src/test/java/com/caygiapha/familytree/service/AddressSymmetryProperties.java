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
import java.util.stream.IntStream;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based tests for the address-symmetry guarantee of the {@code Kinship_Resolver} (design:
 * <em>Kinship_Resolver Algorithm — Symmetry (8.6)</em>).
 *
 * <p>Feature: vietnamese-family-tree, Property 13
 *
 * <p><strong>Property 13: Address symmetry</strong> — for <em>any</em> pair of nodes connected
 * solely by derived relationships, if ego addresses target with a <em>descendant</em> term (such as
 * cháu), then target addresses ego with the corresponding <em>ascendant</em> term
 * (bác/chú/cô/dì/cậu/ông/bà), per the inverse-term mapping.
 *
 * <p><strong>Two layers are validated:</strong>
 *
 * <ol>
 *   <li><strong>Structural symmetry of the canonical descriptor.</strong> Reversing ego and target
 *       swaps the descriptor's {@code upCount} and {@code downCount}
 *       ({@code reverse.upCount == forward.downCount} and vice versa). This is the structural fact
 *       the design relies on: "reversing the path swaps {@code upCount}/{@code downCount} and the
 *       canonical key for the reversed path maps to the inverse term." A descendant relation
 *       (ego is an ancestor of target: {@code upCount == 0, downCount > 0}) reverses to an ascendant
 *       relation ({@code upCount > 0, downCount == 0}). If {@link CanonicalRelation#canonicalKey()}
 *       did not actually invert under reversal, this assertion fails rather than being masked.</li>
 *   <li><strong>Inverse-term mapping through the region table.</strong> An
 *       <em>inverse-consistent</em> {@link RegionTermLookup} is built programmatically: every
 *       canonical key produced over the generated graph is seeded with a direction term, and the
 *       key for the reversed relation is seeded with the matching inverse term (descendant
 *       {@code cháu}-style ↔ ascendant). Resolving both directions then yields the inverse pair the
 *       table defines, so a descendant term one way forces the corresponding ascendant term the
 *       other.</li>
 * </ol>
 *
 * <p>The generator builds random <em>forests</em> of bloodline (father/mother) edges over a node
 * pool — each node has at most one parent, so the graph is acyclic and the kinship path between any
 * connected pair is unique. Unique paths make the up/down decomposition (and therefore its reversal)
 * unambiguous, which is exactly the descendant/ascendant structure Property 13 concerns. Each person
 * is given a distinct birth order, so every sibling branch's elder/younger distinction is
 * determinate and reachable pairs resolve (never collapsing to the indeterminate-order indicator).
 *
 * <p><strong>Validates: Requirements 8.6</strong>
 */
class AddressSymmetryProperties {

    private static final UUID TREE_ID = new UUID(13L, 13L);
    private static final String REGION = "Bac";

    private final KinshipResolver resolver = new KinshipResolver();
    private final KinshipAddressService service =
            new KinshipAddressService(resolver, null, null, null, null, null);

    /**
     * A node's generated attributes: whether it attaches to an earlier node as a child, which
     * earlier node (after reduction into range), the parent link role, and the node's gender.
     */
    private record NodeSpec(boolean hasParent, int rawParent, ParentType link, String gender) {}

    /** A generated family forest over {@code size} nodes. */
    private record Family(int size, List<NodeSpec> specs) {

        /** Stable, distinct ids for the pool. */
        List<UUID> pool() {
            return IntStream.range(0, size).mapToObj(i -> new UUID(0L, i)).toList();
        }

        /** People with distinct birth orders/years so every sibling branch is determinate. */
        Map<UUID, Person> people(List<UUID> pool) {
            Map<UUID, Person> map = new HashMap<>();
            for (int i = 0; i < size; i++) {
                Person p = new Person(TREE_ID, "P" + i, specs.get(i).gender());
                p.setBirthOrder(i + 1); // unique -> branch order always decidable
                p.setBirthYear(1900 + 5 * i);
                map.put(pool.get(i), p);
            }
            return map;
        }

        /**
         * Bloodline edges forming a forest: node {@code i} (for {@code i >= 1}) optionally attaches
         * to an earlier node {@code rawParent mod i} (strictly less than {@code i}, so acyclic and
         * at most one parent per node).
         */
        List<Relationship> relationships(List<UUID> pool) {
            List<Relationship> rels = new ArrayList<>();
            for (int i = 1; i < size; i++) {
                NodeSpec spec = specs.get(i);
                if (!spec.hasParent()) {
                    continue;
                }
                int parent = Math.floorMod(spec.rawParent(), i); // 0 .. i-1
                String type =
                        spec.link() == ParentType.FATHER
                                ? RelationshipService.TYPE_BLOODLINE_FATHER
                                : RelationshipService.TYPE_BLOODLINE_MOTHER;
                rels.add(new Relationship(TREE_ID, type, pool.get(parent), pool.get(i)));
            }
            return rels;
        }
    }

    @Provide
    Arbitrary<Family> families() {
        Arbitrary<Integer> poolSize = Arbitraries.integers().between(2, 7);
        return poolSize.flatMap(size -> nodeSpec().list().ofSize(size).map(specs -> new Family(size, specs)));
    }

    private Arbitrary<NodeSpec> nodeSpec() {
        Arbitrary<Boolean> hasParent = Arbitraries.of(true, true, true, false); // mostly connected
        Arbitrary<Integer> rawParent = Arbitraries.integers().between(0, 1000);
        Arbitrary<ParentType> link = Arbitraries.of(ParentType.FATHER, ParentType.MOTHER);
        Arbitrary<String> gender = Arbitraries.of("male", "female");
        return Combinators.combine(hasParent, rawParent, link, gender).as(NodeSpec::new);
    }

    /**
     * Feature: vietnamese-family-tree, Property 13
     *
     * <p>Structural symmetry: for every ordered pair connected solely by derived (bloodline) edges,
     * reversing ego and target swaps {@code upCount} and {@code downCount}. Consequently a
     * descendant relation reverses to an ascendant relation and vice versa.
     *
     * <p><strong>Validates: Requirements 8.6</strong>
     */
    @Property(tries = 200)
    void reversingSwapsUpAndDownCounts(@ForAll("families") Family family) {
        List<UUID> pool = family.pool();
        Map<UUID, Person> people = family.people(pool);
        Function<UUID, Person> lookup = people::get;
        KinshipGraphProjection projection =
                KinshipGraphProjection.fromEdges(TREE_ID, family.relationships(pool));

        for (UUID a : pool) {
            for (UUID b : pool) {
                if (a.equals(b)) {
                    continue;
                }
                CanonicalResolution forward = resolver.resolveCanonical(projection, a, b, lookup);
                CanonicalResolution reverse = resolver.resolveCanonical(projection, b, a, lookup);

                // Symmetric reachability: a path a->b exists iff a path b->a exists.
                assertThat(forward.isResolved())
                        .as("reachability is symmetric for %s <-> %s", a, b)
                        .isEqualTo(reverse.isResolved());

                if (!forward.isResolved()) {
                    continue;
                }

                CanonicalRelation f = forward.relation();
                CanonicalRelation r = reverse.relation();

                // (8.6) Reversing the path swaps the up/down generation counts.
                assertThat(r.upCount())
                        .as("reverse.up == forward.down for %s -> %s (keys %s / %s)",
                                a, b, f.canonicalKey(), r.canonicalKey())
                        .isEqualTo(f.downCount());
                assertThat(r.downCount())
                        .as("reverse.down == forward.up for %s -> %s (keys %s / %s)",
                                a, b, f.canonicalKey(), r.canonicalKey())
                        .isEqualTo(f.upCount());

                // A descendant relation (ego is ancestor of target) reverses to an ascendant one.
                if (f.upCount() == 0 && f.downCount() > 0) {
                    assertThat(r.upCount())
                            .as("descendant %s -> %s reverses to ascendant", a, b)
                            .isGreaterThan(0);
                    assertThat(r.downCount()).isZero();
                }
            }
        }
    }

    /**
     * Feature: vietnamese-family-tree, Property 13
     *
     * <p>Inverse-term mapping: with an inverse-consistent region term table, if ego addresses target
     * with a descendant term then target addresses ego with the corresponding ascendant term (and
     * vice versa); in general the forward and reverse terms are the inverse pair the table defines.
     *
     * <p><strong>Validates: Requirements 8.6</strong>
     */
    @Property(tries = 200)
    void descendantTermForcesCorrespondingAscendantTerm(@ForAll("families") Family family) {
        List<UUID> pool = family.pool();
        Map<UUID, Person> people = family.people(pool);
        Function<UUID, Person> lookup = people::get;
        KinshipGraphProjection projection =
                KinshipGraphProjection.fromEdges(TREE_ID, family.relationships(pool));

        // Build an INVERSE-CONSISTENT term table over the keys the graph actually produces: each
        // canonical key gets a direction term derived purely from its (up, down) counts, so the key
        // of any relation and the key of its reverse carry inverse terms by construction. This avoids
        // depending on task 3.9's seeded region data.
        Map<String, String> terms = new HashMap<>();
        for (UUID a : pool) {
            for (UUID b : pool) {
                if (a.equals(b)) {
                    continue;
                }
                CanonicalResolution res = resolver.resolveCanonical(projection, a, b, lookup);
                if (res.isResolved()) {
                    CanonicalRelation rel = res.relation();
                    terms.put(rel.canonicalKey(), directionTerm(rel.upCount(), rel.downCount()));
                }
            }
        }
        RegionTermLookup termLookup =
                (region, key) -> Optional.ofNullable(REGION.equals(region) ? terms.get(key) : null);

        for (UUID a : pool) {
            for (UUID b : pool) {
                if (a.equals(b)) {
                    continue;
                }
                AddressResolution forward =
                        service.resolve(REGION, projection, a, b, lookup, termLookup);
                AddressResolution reverse =
                        service.resolve(REGION, projection, b, a, lookup, termLookup);

                if (forward.status() != Status.RESOLVED) {
                    continue;
                }
                // Both directions are reachable and seeded, so the reverse term is also defined.
                assertThat(reverse.status())
                        .as("reverse term defined for %s -> %s", b, a)
                        .isEqualTo(Status.RESOLVED);

                String forwardTerm = forward.term();
                String reverseTerm = reverse.term();

                // The forward and reverse terms are the inverse pair the table defines. (8.6)
                assertThat(reverseTerm)
                        .as("reverse term is the inverse of the forward term for %s <-> %s", a, b)
                        .isEqualTo(inverse(forwardTerm));

                // The Property-13 headline: a descendant term one way forces the corresponding
                // ascendant term the other way.
                if (isDescendantTerm(forwardTerm)) {
                    assertThat(isAscendantTerm(reverseTerm))
                            .as("descendant term %s (%s -> %s) forces ascendant term %s (%s -> %s)",
                                    forwardTerm, a, b, reverseTerm, b, a)
                            .isTrue();
                }
            }
        }
    }

    // --- Inverse-consistent direction-term model ----------------------------------------------

    /**
     * A synthetic direction term derived purely from generation counts: a descendant ({@code cháu}
     * style) term when the target is below the meeting node, an ascendant term when above, and a
     * same-generation term otherwise. Magnitude is the net generational distance so that the
     * reversed relation maps to the matching inverse magnitude.
     */
    private static String directionTerm(int up, int down) {
        if (down > up) {
            return "chau-" + (down - up);
        }
        if (up > down) {
            return "anc-" + (up - down);
        }
        return "same-" + up;
    }

    private static boolean isDescendantTerm(String term) {
        return term.startsWith("chau-");
    }

    private static boolean isAscendantTerm(String term) {
        return term.startsWith("anc-");
    }

    /** The inverse of a direction term: descendant ↔ ascendant of the same magnitude. */
    private static String inverse(String term) {
        if (term.startsWith("chau-")) {
            return "anc-" + term.substring("chau-".length());
        }
        if (term.startsWith("anc-")) {
            return "chau-" + term.substring("anc-".length());
        }
        return term; // same-generation terms are self-inverse
    }
}
