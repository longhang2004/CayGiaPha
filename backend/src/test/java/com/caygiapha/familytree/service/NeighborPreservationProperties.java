package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.CanonicalRelation.BranchOrder;
import com.caygiapha.familytree.service.CanonicalRelation.Gender;
import com.caygiapha.familytree.service.CanonicalRelation.Side;
import com.caygiapha.familytree.service.RelationshipService.CreateRelationshipCommand;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
 * Property-based test for the neighbor-preservation node-deletion strategy of
 * {@link PersonDeletionService#deletePreserve} (design: <em>Node deletion — Neighbor preservation
 * (15.4, 15.5, 15.7, 15.8)</em>).
 *
 * <p>Feature: vietnamese-family-tree, Property 22
 *
 * <p><strong>Property 22: Neighbor preservation</strong> — for any graph and any target node:
 *
 * <ul>
 *   <li>every former neighbor of the target is <em>retained</em> (only the target node is removed),
 *       even if a neighbor is left with zero edges (15.4, 15.8); and</li>
 *   <li>an {@code Asserted_Relationship} labeled with the pre-deletion {@code Form_Of_Address} is
 *       created for an unordered pair of derived neighbors {@code (A, B)} <em>iff</em> the target
 *       was a cut node for that pair (after removing the target, {@code A} and {@code B} are no
 *       longer connected by any derived path) <strong>and</strong> the pre-deletion address was
 *       defined ({@code RESOLVED}); no asserted edge is created for any other pair (15.5, 15.7).
 *   </li>
 * </ul>
 *
 * <p><strong>Validates: Requirements 15.4, 15.5, 15.7, 15.8</strong>
 *
 * <p>The repositories are backed by stateful in-memory fakes (mirroring
 * {@code PersonDeletionServiceTest}/{@code CascadeDeletionProperties}); the cached pre-deletion
 * projection is built from the generated edge set; the address service returns a DEFINED
 * (RESOLVED) address for some neighbor pairs and an undefined/unresolved result for others; and the
 * relationship service captures the asserted edges that get created. The set of created asserted
 * edges (as unordered endpoint pair + label) is compared against an independent oracle that
 * recomputes derived connectivity over the post-deletion graph.
 */
class NeighborPreservationProperties {

    private static final UUID TREE_ID = new UUID(22L, 22L);

    /**
     * A non-null canonical resolution to attach to generated address resolutions; its contents are
     * irrelevant to this property (only {@link AddressResolution.Status} drives the behavior).
     */
    private static final CanonicalResolution CANONICAL = CanonicalResolution.resolved(
            new CanonicalRelation(1, 1, Side.PATERNAL, Gender.MALE, BranchOrder.ELDER, false));

    /** An undirected edge between two distinct node indices, with its (relevant) edge type. */
    private record EdgeDesc(int a, int b, String type) {}

    /** A complete generated scenario: pool size, edge set, target index, and an address seed. */
    private record Scenario(int size, Set<EdgeDesc> edges, int targetIndex, long addrSeed) {}

    @Provide
    Arbitrary<Scenario> scenarios() {
        Arbitrary<Integer> poolSize = Arbitraries.integers().between(3, 9);
        return poolSize.flatMap(size -> {
            // All five edge types, so derived (bloodline/marriage) and excluded
            // (non_bloodline/asserted) neighbors of the target are both exercised.
            Arbitrary<String> types = Arbitraries.of(
                    RelationshipService.TYPE_BLOODLINE_FATHER,
                    RelationshipService.TYPE_BLOODLINE_MOTHER,
                    RelationshipService.TYPE_MARRIAGE,
                    RelationshipService.TYPE_NON_BLOODLINE,
                    RelationshipService.TYPE_ASSERTED);
            Arbitrary<Integer> idx = Arbitraries.integers().between(0, size - 1);
            // Normalize to an undirected (min,max) pair, drop self-loops, and dedupe so the
            // generated graph is simple per (pair,type). This yields a wide variety of shapes
            // (stars, chains, cycles, multi-path neighbor pairs, isolates) around the target.
            Arbitrary<EdgeDesc> edge = Combinators.combine(idx, idx, types)
                    .as((x, y, t) -> new EdgeDesc(Math.min(x, y), Math.max(x, y), t))
                    .filter(e -> e.a() != e.b());
            Arbitrary<Set<EdgeDesc>> edges = edge.set().ofMaxSize(Math.max(2, 3 * size))
                    .map(LinkedHashSet::new);
            Arbitrary<Integer> target = Arbitraries.integers().between(0, size - 1);
            Arbitrary<Long> seed = Arbitraries.longs();
            return Combinators.combine(Arbitraries.just(size), edges, target, seed)
                    .as(Scenario::new);
        });
    }

    /**
     * Feature: vietnamese-family-tree, Property 22
     *
     * <p>For any generated graph and target, {@code deletePreserve} removes only the target (every
     * former neighbor retained, 15.4/15.8) and creates an asserted edge labeled with the
     * pre-deletion address exactly for cut-node neighbor pairs whose pre-deletion address was
     * defined (15.5/15.7) — matching an independent connectivity oracle.
     */
    @Property(tries = 200)
    void preserveRetainsNeighborsAndAssertsExactlyCutNodeDefinedPairs(
            @ForAll("scenarios") Scenario scenario) {
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
        for (EdgeDesc e : scenario.edges()) {
            relStore.add(new Relationship(TREE_ID, e.type(), pool.get(e.a()), pool.get(e.b())));
        }

        PersonRepository personRepository = mock(PersonRepository.class);
        RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
        KinshipGraphProjectionCache projectionCache = mock(KinshipGraphProjectionCache.class);
        KinshipAddressService addressService = mock(KinshipAddressService.class);
        RelationshipService relationshipService = mock(RelationshipService.class);

        when(personRepository.findByIdAndTreeId(any(UUID.class), any(UUID.class)))
                .thenAnswer(inv -> {
                    UUID id = inv.getArgument(0);
                    UUID tree = inv.getArgument(1);
                    Person p = personStore.get(id);
                    return (p != null && p.getTreeId().equals(tree))
                            ? Optional.of(p)
                            : Optional.empty();
                });
        // Neighbor preservation removes the target with a single delete(person); capture by store.
        doAnswer(inv -> {
            Person p = inv.getArgument(0);
            UUID id = personIds.get(p);
            if (id != null) {
                personStore.remove(id);
            }
            return null;
        }).when(personRepository).delete(any(Person.class));

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

        // The cached pre-deletion projection is built from the full (pre-deletion) edge set; the
        // service queries it before mutating, so building lazily from relStore reflects that state.
        when(projectionCache.getProjection(TREE_ID))
                .thenAnswer(inv -> KinshipGraphProjection.fromEdges(TREE_ID, relStore));

        // Address service: DEFINED (RESOLVED) for some unordered neighbor pairs, undefined/
        // unresolved for the rest, deterministically per pair so the oracle agrees.
        when(addressService.resolveAddress(any(UUID.class), any(UUID.class), any(UUID.class)))
                .thenAnswer(inv -> {
                    UUID a = inv.getArgument(1);
                    UUID b = inv.getArgument(2);
                    Optional<String> label = definedAddress(scenario.addrSeed(), a, b);
                    if (label.isPresent()) {
                        return AddressResolution.resolved(label.get(), CANONICAL);
                    }
                    // Vary the undefined outcome between the two non-term statuses.
                    return undefinedFlavor(scenario.addrSeed(), a, b)
                            ? AddressResolution.undefinedForRegion(CANONICAL)
                            : AddressResolution.unresolved(CANONICAL);
                });

        List<CreateRelationshipCommand> created = new ArrayList<>();
        doAnswer(inv -> {
            created.add(inv.getArgument(0));
            return null;
        }).when(relationshipService).createRelationship(any(CreateRelationshipCommand.class));

        PersonDeletionService service = new PersonDeletionService(
                personRepository,
                relationshipRepository,
                projectionCache,
                addressService,
                relationshipService);

        UUID targetId = pool.get(scenario.targetIndex());

        // ----- Independent oracle: derived neighbors, cut-node pairs, expected asserted edges. -----
        Set<UUID> originalIds = new HashSet<>(personStore.keySet());
        Set<UUID> derivedNeighbors = derivedNeighborsOf(scenario, pool, targetId);
        Set<CreatedKey> expected = expectedAssertedEdges(scenario, pool, targetId, derivedNeighbors);

        // ----- Act. -----
        service.deletePreserve(TREE_ID, targetId);

        // ----- (15.4, 15.8) Every former neighbor is retained: only the target is removed. -----
        Set<UUID> expectedSurvivors = new HashSet<>(originalIds);
        expectedSurvivors.remove(targetId);
        assertThat(personStore.keySet())
                .as("only the target node is removed; all former neighbors are retained")
                .isEqualTo(expectedSurvivors);
        verify(personRepository, never()).deleteAll(any());

        // ----- (15.5, 15.7) Asserted edges created exactly for cut-node + defined-address pairs. -----
        Set<CreatedKey> actual = new HashSet<>();
        for (CreateRelationshipCommand cmd : created) {
            assertThat(cmd.type())
                    .as("preservation creates only asserted edges")
                    .isEqualTo(RelationshipService.TYPE_ASSERTED);
            assertThat(cmd.treeId()).isEqualTo(TREE_ID);
            // Both endpoints must be derived neighbors of the (now-removed) target.
            assertThat(derivedNeighbors)
                    .as("asserted edge endpoints must both be former derived neighbors")
                    .contains(cmd.sourceId(), cmd.targetId());
            actual.add(CreatedKey.of(cmd.sourceId(), cmd.targetId(), cmd.assertedLabel()));
        }
        // One edge per qualifying unordered pair (no duplicate pairs created).
        assertThat(actual)
                .as("no duplicate asserted edge for the same unordered neighbor pair")
                .hasSameSizeAs(created);
        assertThat(actual)
                .as("created asserted edges (unordered pair + label) match the oracle exactly")
                .isEqualTo(expected);
    }

    /** A created asserted edge, keyed by its unordered endpoint pair and label. */
    private record CreatedKey(UUID lo, UUID hi, String label) {
        static CreatedKey of(UUID x, UUID y, String label) {
            return x.compareTo(y) <= 0 ? new CreatedKey(x, y, label) : new CreatedKey(y, x, label);
        }
    }

    /** The derived projection neighbors of the target in the pre-deletion graph. */
    private Set<UUID> derivedNeighborsOf(Scenario scenario, List<UUID> pool, UUID targetId) {
        Set<UUID> neighbors = new HashSet<>();
        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(
                TREE_ID, relationshipsFromScenario(scenario, pool));
        for (KinshipGraphProjection.Step step : projection.stepsFrom(targetId)) {
            if (!step.to().equals(targetId)) {
                neighbors.add(step.to());
            }
        }
        return neighbors;
    }

    /**
     * The independent oracle for the created asserted edges: for each unordered pair of derived
     * neighbors, an edge is expected iff the pre-deletion address was defined (RESOLVED) AND the
     * pair is no longer derived-connected once the target and its incident edges are removed.
     */
    private Set<CreatedKey> expectedAssertedEdges(
            Scenario scenario, List<UUID> pool, UUID targetId, Set<UUID> derivedNeighbors) {
        // Post-deletion derived projection: derived edges with neither endpoint being the target.
        KinshipGraphProjection postProjection = KinshipGraphProjection.fromEdges(
                TREE_ID,
                relationshipsFromScenario(scenario, pool).stream()
                        .filter(edge -> !targetId.equals(edge.getSourceId())
                                && !targetId.equals(edge.getTargetId()))
                        .toList());

        List<UUID> neighbors = new ArrayList<>(derivedNeighbors);
        Set<CreatedKey> expected = new HashSet<>();
        for (int i = 0; i < neighbors.size(); i++) {
            for (int j = i + 1; j < neighbors.size(); j++) {
                UUID a = neighbors.get(i);
                UUID b = neighbors.get(j);
                Optional<String> label = definedAddress(scenario.addrSeed(), a, b);
                if (label.isEmpty()) {
                    continue; // (15.7) undefined pre-deletion address -> no asserted edge
                }
                if (!reachable(postProjection, a, b)) {
                    // (15.5) target was a cut node for this pair -> create the labeled asserted edge
                    expected.add(CreatedKey.of(a, b, label.get()));
                }
            }
        }
        return expected;
    }

    private List<Relationship> relationshipsFromScenario(Scenario scenario, List<UUID> pool) {
        return scenario.edges().stream()
                .map(e -> new Relationship(TREE_ID, e.type(), pool.get(e.a()), pool.get(e.b())))
                .toList();
    }

    /** Breadth-first reachability over the projection's derived adjacency. */
    private boolean reachable(KinshipGraphProjection projection, UUID from, UUID to) {
        if (from.equals(to)) {
            return true;
        }
        Set<UUID> visited = new HashSet<>();
        Deque<UUID> frontier = new ArrayDeque<>();
        frontier.add(from);
        visited.add(from);
        while (!frontier.isEmpty()) {
            UUID cur = frontier.poll();
            for (KinshipGraphProjection.Step step : projection.stepsFrom(cur)) {
                UUID nb = step.to();
                if (nb.equals(to)) {
                    return true;
                }
                if (visited.add(nb)) {
                    frontier.add(nb);
                }
            }
        }
        return false;
    }

    private static boolean isDerived(String type) {
        return RelationshipService.TYPE_BLOODLINE_FATHER.equals(type)
                || RelationshipService.TYPE_BLOODLINE_MOTHER.equals(type)
                || RelationshipService.TYPE_MARRIAGE.equals(type);
    }

    /**
     * Deterministic per-(unordered)-pair pre-deletion address: ~2/3 of pairs are DEFINED (a
     * non-empty label), the rest undefined. Symmetric in {@code (x, y)} so the implementation gets
     * the same label whichever direction it queries, and the oracle agrees.
     */
    private static Optional<String> definedAddress(long addrSeed, UUID x, UUID y) {
        int h = pairHash(addrSeed, x, y);
        if (Math.floorMod(h, 3) == 0) {
            return Optional.empty();
        }
        return Optional.of("addr-" + Math.floorMod(h, 997));
    }

    /** Whether an undefined pair should be reported as undefined-for-region (vs. unresolved). */
    private static boolean undefinedFlavor(long addrSeed, UUID x, UUID y) {
        return (pairHash(addrSeed, x, y) & 1) == 0;
    }

    private static int pairHash(long addrSeed, UUID x, UUID y) {
        UUID lo = x.compareTo(y) <= 0 ? x : y;
        UUID hi = x.compareTo(y) <= 0 ? y : x;
        return Objects.hash(addrSeed, lo, hi);
    }
}
