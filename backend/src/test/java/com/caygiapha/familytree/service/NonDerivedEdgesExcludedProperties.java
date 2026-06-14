package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.service.KinshipGraphProjection.Step;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based tests for the kinship graph projection's exclusion of non-derived edges.
 *
 * <p>Feature: vietnamese-family-tree, Property 14
 *
 * <p><strong>Property 14: Non-derived edges excluded from path computation</strong> — adding
 * arbitrary {@code non_bloodline} or {@code asserted} edges to a tree changes no derived
 * connectivity: the projection built from the bloodline + marriage base edges is identical (same
 * node set, same {@code parentsOf}/{@code childrenOf}/{@code spousesOf} for every node, and the
 * same reachability between every ordered pair) to the projection built from the same base plus an
 * arbitrary set of {@code non_bloodline} and {@code asserted} edges. Because those edges are
 * excluded entirely from adjacency, they are never traversed by any path computation, and any node
 * touched only by such edges does not appear in the projection at all.
 *
 * <p>The full BFS address resolver (task 3.3) is being implemented concurrently and exposes no
 * stable, compiling address API yet, so this property is anchored on the stable projection contract
 * (derived connectivity / adjacency / reachability), which is exactly what every address
 * computation traverses.
 *
 * <p><strong>Validates: Requirements 6.4, 12.3</strong>
 */
class NonDerivedEdgesExcludedProperties {

    private static final UUID TREE_ID = new UUID(7L, 7L);

    /** A generated edge expressed as a type plus source/target indices into the node pool. */
    private record EdgeDesc(String type, int src, int tgt) {}

    /**
     * A full generated scenario: a fixed pool of distinct node ids, the derivation-relevant
     * <em>base</em> edges (bloodline + marriage), and the non-derived <em>extra</em> edges
     * (non_bloodline + asserted) whose addition must not change any derived connectivity.
     */
    private record Scenario(
            List<UUID> pool, List<Relationship> baseEdges, List<Relationship> extraEdges) {}

    @Provide
    Arbitrary<Scenario> scenarios() {
        Arbitrary<Integer> baseNodeCount = Arbitraries.integers().between(2, 6);
        Arbitrary<Integer> extraOnlyNodeCount = Arbitraries.integers().between(0, 3);

        return Combinators.combine(baseNodeCount, extraOnlyNodeCount)
                .flatAs((baseNodes, extraOnly) -> {
                    int total = baseNodes + extraOnly;
                    // Distinct, stable ids; extra-only ids (indices >= baseNodes) are referenced
                    // exclusively by non-derived edges so they must never enter the projection.
                    List<UUID> pool = IntStream.range(0, total)
                            .mapToObj(i -> new UUID(0L, i))
                            .toList();

                    Arbitrary<List<EdgeDesc>> baseEdges =
                            baseEdgeDesc(baseNodes).list().ofMaxSize(2 * baseNodes);
                    Arbitrary<List<EdgeDesc>> extraEdges =
                            extraEdgeDesc(total).list().ofMaxSize(8);

                    return Combinators.combine(baseEdges, extraEdges)
                            .as((base, extra) -> new Scenario(
                                    pool,
                                    toRelationships(pool, base),
                                    toRelationships(pool, extra)));
                });
    }

    /** Base edges are the only derivation-relevant kinds: father/mother bloodline and marriage. */
    private Arbitrary<EdgeDesc> baseEdgeDesc(int nodeCount) {
        Arbitrary<String> types = Arbitraries.of(
                RelationshipService.TYPE_BLOODLINE_FATHER,
                RelationshipService.TYPE_BLOODLINE_MOTHER,
                RelationshipService.TYPE_MARRIAGE);
        Arbitrary<Integer> idx = Arbitraries.integers().between(0, nodeCount - 1);
        return Combinators.combine(types, idx, idx)
                .as(EdgeDesc::new)
                .filter(e -> e.src() != e.tgt());
    }

    /** Extra edges are exactly the non-derived kinds excluded from path computation. */
    private Arbitrary<EdgeDesc> extraEdgeDesc(int nodeCount) {
        Arbitrary<String> types = Arbitraries.of(
                RelationshipService.TYPE_NON_BLOODLINE, RelationshipService.TYPE_ASSERTED);
        Arbitrary<Integer> idx = Arbitraries.integers().between(0, nodeCount - 1);
        return Combinators.combine(types, idx, idx)
                .as(EdgeDesc::new)
                .filter(e -> e.src() != e.tgt());
    }

    private static List<Relationship> toRelationships(List<UUID> pool, List<EdgeDesc> descs) {
        List<Relationship> edges = new ArrayList<>(descs.size());
        for (EdgeDesc d : descs) {
            Relationship r =
                    new Relationship(TREE_ID, d.type(), pool.get(d.src()), pool.get(d.tgt()));
            switch (d.type()) {
                case RelationshipService.TYPE_MARRIAGE -> r.setMaritalStatus("married");
                case RelationshipService.TYPE_NON_BLOODLINE -> r.setSocialType("friend");
                case RelationshipService.TYPE_ASSERTED -> r.setAssertedLabel("bác");
                default -> {
                    // bloodline edges carry no type-specific payload
                }
            }
            edges.add(r);
        }
        return edges;
    }

    /**
     * Feature: vietnamese-family-tree, Property 14
     *
     * <p>Building a projection from the base edges and from base + arbitrary non-derived edges
     * yields identical derived connectivity, proving non_bloodline/asserted edges are never
     * traversed and never introduce nodes.
     */
    @Property(tries = 200)
    void nonDerivedEdgesChangeNoDerivedConnectivity(@ForAll("scenarios") Scenario scenario) {
        KinshipGraphProjection base =
                KinshipGraphProjection.fromEdges(TREE_ID, scenario.baseEdges());

        List<Relationship> combined = new ArrayList<>(scenario.baseEdges());
        combined.addAll(scenario.extraEdges());
        KinshipGraphProjection withExtra = KinshipGraphProjection.fromEdges(TREE_ID, combined);

        // (1) Same node set: non-derived edges add no nodes to the projection.
        assertThat(withExtra.nodes()).isEqualTo(base.nodes());

        // (2) Identical adjacency for every node that participates in derivation.
        for (UUID node : base.nodes()) {
            assertThat(withExtra.parentsOf(node))
                    .as("parents of %s", node)
                    .containsExactlyInAnyOrderElementsOf(base.parentsOf(node));
            assertThat(withExtra.childrenOf(node))
                    .as("children of %s", node)
                    .containsExactlyInAnyOrderElementsOf(base.childrenOf(node));
            assertThat(withExtra.spousesOf(node))
                    .as("spouses of %s", node)
                    .isEqualTo(base.spousesOf(node));
        }

        // (3) Nodes touched only by non-derived edges never enter the projection and have no
        //     adjacency, so the asserted/non-bloodline edge is genuinely never traversed.
        for (UUID node : scenario.pool()) {
            if (!base.contains(node)) {
                assertThat(withExtra.contains(node)).as("phantom node %s absent", node).isFalse();
                assertThat(withExtra.parentsOf(node)).isEmpty();
                assertThat(withExtra.childrenOf(node)).isEmpty();
                assertThat(withExtra.spousesOf(node)).isEmpty();
                assertThat(withExtra.stepsFrom(node)).isEmpty();
            }
        }

        // (4) Identical reachability between every ordered pair: adding non-derived edges creates
        //     no new derived connectivity.
        for (UUID origin : base.nodes()) {
            assertThat(reachableFrom(withExtra, origin))
                    .as("reachable set from %s", origin)
                    .isEqualTo(reachableFrom(base, origin));
        }
    }

    /** Set of nodes reachable from {@code origin} via the projection's typed adjacency steps. */
    private static Set<UUID> reachableFrom(KinshipGraphProjection projection, UUID origin) {
        Set<UUID> visited = new HashSet<>();
        Deque<UUID> queue = new ArrayDeque<>();
        visited.add(origin);
        queue.add(origin);
        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            for (Step step : projection.stepsFrom(current)) {
                if (visited.add(step.to())) {
                    queue.add(step.to());
                }
            }
        }
        return visited;
    }
}
