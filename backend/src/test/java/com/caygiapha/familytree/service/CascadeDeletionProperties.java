package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
 * Property-based test for the cascade node-deletion strategy of {@link PersonDeletionService}
 * (design: <em>Node deletion — Cascade (15.3), worklist sweep</em>).
 *
 * <p>Feature: vietnamese-family-tree, Property 21
 *
 * <p><strong>Property 21: Cascade deletion transitive orphan removal</strong> — for any graph and
 * any target node, {@link PersonDeletionService#deleteCascade} removes the target and all its
 * incident edges, then transitively removes every <em>other</em> node that became edgeless as a
 * result of the cascade, while <em>retaining</em> pre-existing isolates (nodes that already had
 * zero edges before the deletion). No dangling edge survives.
 *
 * <p><strong>Validates: Requirements 15.3</strong>
 *
 * <p>The repositories are backed by stateful in-memory fakes: a generated graph is loaded, the
 * deletion is observed against the backing collections, and the surviving persons/relationships are
 * compared against an independent oracle. The {@link KinshipGraphProjectionCache} is a no-op mock.
 */
class CascadeDeletionProperties {

    private static final UUID TREE_ID = new UUID(21L, 21L);

    /** An undirected edge between two distinct node indices, plus an (irrelevant) edge type. */
    private record EdgeDesc(int a, int b, String type) {}

    /** A complete generated scenario: a node pool, an undirected edge set, and a target index. */
    private record Scenario(int size, Set<EdgeDesc> edges, int targetIndex) {}

    @Provide
    Arbitrary<Scenario> scenarios() {
        Arbitrary<Integer> poolSize = Arbitraries.integers().between(1, 10);
        return poolSize.flatMap(size -> {
            Arbitrary<String> types = Arbitraries.of(
                    RelationshipService.TYPE_BLOODLINE_FATHER,
                    RelationshipService.TYPE_BLOODLINE_MOTHER,
                    RelationshipService.TYPE_MARRIAGE,
                    RelationshipService.TYPE_NON_BLOODLINE,
                    RelationshipService.TYPE_ASSERTED);
            Arbitrary<Integer> idx = Arbitraries.integers().between(0, size - 1);
            // Normalize to an undirected (min,max) pair, drop self-loops, and dedupe into a set so
            // the generated graph is simple (at most one edge per unordered pair). This keeps the
            // oracle's incident-edge count aligned with the service's live edge accounting while
            // still producing a wide variety of shapes (chains, stars, cycles, forests, isolates).
            Arbitrary<EdgeDesc> edge = Combinators.combine(idx, idx, types)
                    .as((x, y, t) -> new EdgeDesc(Math.min(x, y), Math.max(x, y), t))
                    .filter(e -> e.a() != e.b());
            Arbitrary<Set<EdgeDesc>> edges = edge.set().ofMaxSize(Math.max(1, 2 * size))
                    .map(LinkedHashSet::new);
            Arbitrary<Integer> target = Arbitraries.integers().between(0, size - 1);
            return Combinators.combine(Arbitraries.just(size), edges, target).as(Scenario::new);
        });
    }

    /**
     * Feature: vietnamese-family-tree, Property 21
     *
     * <p>For any generated graph and target node, the cascade removes the target and exactly the
     * nodes that become edgeless as a result, retains pre-existing isolates, and leaves no dangling
     * edge — matching an independent worklist oracle.
     */
    @Property(tries = 200)
    void cascadeRemovesTargetAndTransitiveOrphansOnly(@ForAll("scenarios") Scenario scenario) {
        // ----- Build the generated graph as stateful in-memory repository fakes. -----
        List<UUID> pool = IntStream.range(0, scenario.size())
                .mapToObj(i -> new UUID(0L, i))
                .toList();

        Map<UUID, Person> personStore = new HashMap<>();
        IdentityHashMap<Person, UUID> personIds = new IdentityHashMap<>();
        for (int i = 0; i < scenario.size(); i++) {
            UUID id = pool.get(i);
            Person p = new Person(TREE_ID, "P" + i, "male");
            personStore.put(id, p);
            personIds.put(p, id);
        }

        List<Relationship> relStore = new ArrayList<>();
        IdentityHashMap<Relationship, int[]> relEndpoints = new IdentityHashMap<>();
        for (EdgeDesc e : scenario.edges()) {
            Relationship r =
                    new Relationship(TREE_ID, e.type(), pool.get(e.a()), pool.get(e.b()));
            relStore.add(r);
            relEndpoints.put(r, new int[] {e.a(), e.b()});
        }

        PersonRepository personRepository = mock(PersonRepository.class);
        RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
        KinshipGraphProjectionCache projectionCache = mock(KinshipGraphProjectionCache.class);

        when(personRepository.findByIdAndTreeId(any(UUID.class), any(UUID.class)))
                .thenAnswer(inv -> {
                    UUID id = inv.getArgument(0);
                    UUID tree = inv.getArgument(1);
                    Person p = personStore.get(id);
                    return (p != null && p.getTreeId().equals(tree))
                            ? Optional.of(p)
                            : Optional.empty();
                });
        doAnswer(inv -> {
            Iterable<? extends Person> toDelete = inv.getArgument(0);
            for (Person p : toDelete) {
                UUID id = personIds.get(p);
                if (id != null) {
                    personStore.remove(id);
                }
            }
            return null;
        }).when(personRepository).deleteAll(any());

        when(relationshipRepository.findByTreeId(any(UUID.class)))
                .thenAnswer(inv -> new ArrayList<>(relStore));
        doAnswer(inv -> {
            Iterable<? extends Relationship> toDelete = inv.getArgument(0);
            Set<Relationship> targets =
                    java.util.Collections.newSetFromMap(new IdentityHashMap<>());
            toDelete.forEach(targets::add);
            relStore.removeIf(targets::contains);
            return null;
        }).when(relationshipRepository).deleteAll(any());

        // The address service and relationship service are only used by the neighbor-preservation
        // strategy (task 5.3); the cascade strategy under test never touches them, so no-op mocks
        // suffice.
        KinshipAddressService kinshipAddressService = mock(KinshipAddressService.class);
        RelationshipService relationshipService = mock(RelationshipService.class);
        PersonDeletionService service = new PersonDeletionService(
                personRepository,
                relationshipRepository,
                projectionCache,
                kinshipAddressService,
                relationshipService);

        UUID targetId = pool.get(scenario.targetIndex());

        // ----- Independent oracle: which nodes survive the cascade. -----
        OracleResult oracle = computeOracle(scenario, pool, targetId);

        // ----- Act. -----
        service.deleteCascade(TREE_ID, targetId);

        // ----- Assert: surviving persons match the oracle exactly. -----
        Set<UUID> survivingPersons = new HashSet<>(personStore.keySet());
        assertThat(survivingPersons)
                .as("surviving nodes must match the oracle (target + cascade orphans removed, "
                        + "pre-existing isolates retained)")
                .isEqualTo(oracle.survivors());

        // The target is always removed.
        assertThat(survivingPersons).as("target node is removed").doesNotContain(targetId);

        // Every pre-existing isolate is retained.
        assertThat(survivingPersons)
                .as("pre-existing isolates are retained")
                .containsAll(oracle.preExistingIsolates());

        // Surviving edges are exactly the edges with both endpoints among survivors: no dangling
        // edge (an edge incident to a removed node) remains.
        Set<int[]> survivingEdgePairs = new HashSet<>();
        for (Relationship r : relStore) {
            int[] ends = relEndpoints.get(r);
            assertThat(survivingPersons)
                    .as("surviving edge must have both endpoints alive")
                    .contains(r.getSourceId(), r.getTargetId());
            survivingEdgePairs.add(new int[] {ends[0], ends[1]});
        }
        // Conversely, every oracle-surviving edge is still present.
        assertThat(relStore.size())
                .as("surviving relationship set matches the oracle (no dangling edges)")
                .isEqualTo(oracle.survivingEdgeCount());

        // Independent fixpoint cross-check on the oracle's survivor set: every surviving node is
        // either a pre-existing isolate or still has at least one surviving incident edge, and
        // every removed non-target node had no surviving incident edge.
        assertFixpoint(scenario, pool, targetId, oracle);
    }

    /** The oracle's verdict: which nodes survive, the pre-existing isolates, and surviving edges. */
    private record OracleResult(
            Set<UUID> survivors, Set<UUID> preExistingIsolates, int survivingEdgeCount) {}

    /**
     * Independent worklist oracle mirroring the design's sweep: starting from the target, removing a
     * node strips one incident edge from each not-yet-removed neighbor; a neighbor that thereby
     * reaches zero live edges became edgeless as a result of the cascade and is removed too. A
     * pre-existing isolate (original degree 0) is never a neighbor of a removed node, so it is never
     * reached and is retained.
     */
    private OracleResult computeOracle(Scenario scenario, List<UUID> pool, UUID targetId) {
        int n = scenario.size();
        Map<Integer, List<Integer>> adj = new HashMap<>();
        int[] liveDegree = new int[n];
        for (EdgeDesc e : scenario.edges()) {
            adj.computeIfAbsent(e.a(), k -> new ArrayList<>()).add(e.b());
            adj.computeIfAbsent(e.b(), k -> new ArrayList<>()).add(e.a());
            liveDegree[e.a()]++;
            liveDegree[e.b()]++;
        }

        Set<Integer> preExistingIsolates = new HashSet<>();
        for (int i = 0; i < n; i++) {
            if (liveDegree[i] == 0) {
                preExistingIsolates.add(i);
            }
        }

        int targetIdx = scenario.targetIndex();
        Set<Integer> removed = new HashSet<>();
        Deque<Integer> worklist = new ArrayDeque<>();
        removed.add(targetIdx);
        worklist.add(targetIdx);
        while (!worklist.isEmpty()) {
            int cur = worklist.poll();
            for (int nb : adj.getOrDefault(cur, List.of())) {
                if (removed.contains(nb)) {
                    continue;
                }
                if (--liveDegree[nb] <= 0) {
                    removed.add(nb);
                    worklist.add(nb);
                }
            }
        }

        Set<UUID> survivors = new HashSet<>();
        Set<UUID> isolateIds = new HashSet<>();
        for (int i = 0; i < n; i++) {
            if (!removed.contains(i)) {
                survivors.add(pool.get(i));
            }
            // The deletion target is always removed even when it was itself a pre-existing isolate;
            // the retention guarantee covers pre-existing isolates *other than* the target.
            if (preExistingIsolates.contains(i) && i != targetIdx) {
                isolateIds.add(pool.get(i));
            }
        }
        int survivingEdges = 0;
        for (EdgeDesc e : scenario.edges()) {
            if (!removed.contains(e.a()) && !removed.contains(e.b())) {
                survivingEdges++;
            }
        }
        return new OracleResult(survivors, isolateIds, survivingEdges);
    }

    /**
     * Cross-check the defining fixpoint of the cascade independently of how survivors were computed:
     * each surviving node is a pre-existing isolate or has a surviving neighbor; each removed
     * non-target node is not a pre-existing isolate and has no surviving neighbor.
     */
    private void assertFixpoint(
            Scenario scenario, List<UUID> pool, UUID targetId, OracleResult oracle) {
        int n = scenario.size();
        Map<Integer, List<Integer>> adj = new HashMap<>();
        int[] originalDegree = new int[n];
        for (EdgeDesc e : scenario.edges()) {
            adj.computeIfAbsent(e.a(), k -> new ArrayList<>()).add(e.b());
            adj.computeIfAbsent(e.b(), k -> new ArrayList<>()).add(e.a());
            originalDegree[e.a()]++;
            originalDegree[e.b()]++;
        }
        for (int i = 0; i < n; i++) {
            UUID id = pool.get(i);
            boolean survives = oracle.survivors().contains(id);
            boolean isolate = originalDegree[i] == 0;
            long survivingNeighbors = adj.getOrDefault(i, List.of()).stream()
                    .filter(nb -> oracle.survivors().contains(pool.get(nb)))
                    .count();
            if (survives) {
                assertThat(isolate || survivingNeighbors > 0)
                        .as("survivor %s must be a pre-existing isolate or have a surviving "
                                + "neighbor", id)
                        .isTrue();
            } else if (!id.equals(targetId)) {
                assertThat(isolate)
                        .as("a cascade-removed node %s must not be a pre-existing isolate", id)
                        .isFalse();
                assertThat(survivingNeighbors)
                        .as("a cascade-removed node %s must have no surviving neighbor", id)
                        .isZero();
            }
        }
    }
}
