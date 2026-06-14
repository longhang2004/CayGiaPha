package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.RelationshipService.CreateRelationshipCommand;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Feature: vietnamese-family-tree, Property 8
 *
 * <p><strong>Property 8: Bloodline acyclicity.</strong> For any acyclic set of bloodline edges and
 * any candidate bloodline edge, the candidate is rejected with a {@code CYCLE_VIOLATION}
 * <em>if and only if</em> adding it would create a parent-child cycle; after the whole sequence
 * the stored bloodline edge set is always acyclic.
 *
 * <p>Validates: Requirements 4.9.
 *
 * <p>The {@link RelationshipRepository} is backed by a stateful in-memory list so a sequence of
 * bloodline insertions is simulated: {@code save} appends to the store, {@code findByTargetId}
 * returns the incoming edges of a node, and {@code existsByTargetIdAndType} reflects prior
 * inserts. {@link PersonRepository#existsByIdAndTreeId} returns {@code true} for every generated
 * node so node existence never decides the outcome.
 *
 * <p>An independent oracle maintains the set of accepted directed parent&rarr;child edges as a DAG.
 * A candidate {@code parent -> child} would create a cycle exactly when {@code parent} is reachable
 * downward from {@code child} (i.e. {@code child} is already an ancestor of {@code parent}). Because
 * the service checks the at-most-one-parent rule before the cycle rule, the oracle distinguishes
 * the two rejection reasons: a duplicate father/mother for the same child is rejected with
 * {@code PARENT_LIMIT}, not {@code CYCLE_VIOLATION}.
 */
class BloodlineAcyclicityProperties {

    private static final int NODE_POOL_SIZE = 4;

    /** A single bloodline-edge insertion request: a parent, a child, and the parent role. */
    record Insertion(int parentIndex, int childIndex, String type) {
    }

    @Provide
    Arbitrary<List<Insertion>> insertionSequences() {
        Arbitrary<Integer> parentIndex = Arbitraries.integers().between(0, NODE_POOL_SIZE - 1);
        Arbitrary<Integer> childIndex = Arbitraries.integers().between(0, NODE_POOL_SIZE - 1);
        Arbitrary<String> parentType = Arbitraries.of(
                RelationshipService.TYPE_BLOODLINE_FATHER,
                RelationshipService.TYPE_BLOODLINE_MOTHER);
        // Distinct endpoints only: self-reference is Property 6's concern, so the only deciding
        // factors here are the at-most-one-parent rule and the cycle rule.
        Arbitrary<Insertion> insertion =
                Combinators.combine(parentIndex, childIndex, parentType)
                        .as(Insertion::new)
                        .filter(i -> i.parentIndex() != i.childIndex());
        return insertion.list().ofMinSize(1).ofMaxSize(25);
    }

    @Property(tries = 200)
    void candidateRejectedIffItWouldCreateCycle(
            @ForAll("insertionSequences") List<Insertion> insertions) {
        UUID treeId = UUID.randomUUID();

        // Stateful in-memory backing store for the relationship repository.
        List<Relationship> store = new ArrayList<>();
        RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
        PersonRepository personRepository = mock(PersonRepository.class);

        when(personRepository.existsByIdAndTreeId(any(UUID.class), any(UUID.class)))
                .thenReturn(true);
        when(relationshipRepository.save(any(Relationship.class))).thenAnswer(invocation -> {
            Relationship saved = invocation.getArgument(0);
            store.add(saved);
            return saved;
        });
        when(relationshipRepository.existsByTargetIdAndType(any(UUID.class), any(String.class)))
                .thenAnswer(invocation -> {
                    UUID target = invocation.getArgument(0);
                    String type = invocation.getArgument(1);
                    return store.stream().anyMatch(
                            r -> r.getTargetId().equals(target) && r.getType().equals(type));
                });
        when(relationshipRepository.findByTargetId(any(UUID.class))).thenAnswer(invocation -> {
            UUID target = invocation.getArgument(0);
            return store.stream().filter(r -> r.getTargetId().equals(target)).toList();
        });

        KinshipGraphProjectionCache projectionCache = mock(KinshipGraphProjectionCache.class);
        RelationshipService service =
                new RelationshipService(relationshipRepository, personRepository, projectionCache);

        // Fixed pool of node identities.
        UUID[] nodes = new UUID[NODE_POOL_SIZE];
        for (int i = 0; i < nodes.length; i++) {
            nodes[i] = UUID.randomUUID();
        }

        // Oracle state:
        //   acceptedRoles: which (child, parent-role) pairs are already taken (4.4).
        //   childrenAdj:   accepted directed parent -> child edges (the bloodline DAG).
        Map<UUID, Set<String>> acceptedRoles = new HashMap<>();
        Map<UUID, Set<UUID>> childrenAdj = new HashMap<>();

        for (Insertion insertion : insertions) {
            UUID parent = nodes[insertion.parentIndex()];
            UUID child = nodes[insertion.childIndex()];
            String type = insertion.type();

            boolean childAlreadyHasRole =
                    acceptedRoles.getOrDefault(child, Set.of()).contains(type);
            // Adding parent -> child closes a cycle iff parent is reachable downward from child.
            boolean wouldCreateCycle = isReachable(child, parent, childrenAdj);

            CreateRelationshipCommand command = new CreateRelationshipCommand(
                    treeId, type, parent, child, null, null, null);

            if (childAlreadyHasRole) {
                // The at-most-one-parent rule is checked before the cycle rule, so a duplicate
                // father/mother is rejected with PARENT_LIMIT regardless of any cycle.
                assertThatThrownBy(() -> service.createRelationship(command))
                        .isInstanceOfSatisfying(ApiException.class,
                                ex -> assertThat(ex.code()).isEqualTo(ErrorCode.PARENT_LIMIT));
            } else if (wouldCreateCycle) {
                // A candidate that would introduce a parent-child cycle is rejected (4.9).
                assertThatThrownBy(() -> service.createRelationship(command))
                        .isInstanceOfSatisfying(ApiException.class,
                                ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CYCLE_VIOLATION));
            } else {
                // Neither rule triggers: the edge is accepted and persisted.
                Relationship created = service.createRelationship(command);
                assertThat(created).isNotNull();
                assertThat(created.getSourceId()).isEqualTo(parent);
                assertThat(created.getTargetId()).isEqualTo(child);
                assertThat(created.getType()).isEqualTo(type);

                acceptedRoles.computeIfAbsent(child, k -> new HashSet<>()).add(type);
                childrenAdj.computeIfAbsent(parent, k -> new HashSet<>()).add(child);
            }
        }

        // Final invariant: the stored bloodline edge set is acyclic.
        assertThat(isStoredBloodlineSetAcyclic(store))
                .as("stored bloodline edges must form a DAG")
                .isTrue();
    }

    /**
     * Returns {@code true} when {@code goal} is reachable from {@code start} by following accepted
     * parent&rarr;child edges (so {@code start} is an ancestor of {@code goal}). Equivalently, when
     * called as {@code isReachable(child, parent, adj)} it reports whether {@code child} is already
     * an ancestor of {@code parent}, which is exactly the condition under which adding
     * {@code parent -> child} would close a cycle.
     */
    private static boolean isReachable(UUID start, UUID goal, Map<UUID, Set<UUID>> childrenAdj) {
        if (start.equals(goal)) {
            return true;
        }
        Set<UUID> visited = new HashSet<>();
        Deque<UUID> frontier = new ArrayDeque<>();
        frontier.push(start);
        while (!frontier.isEmpty()) {
            UUID current = frontier.pop();
            if (current.equals(goal)) {
                return true;
            }
            if (!visited.add(current)) {
                continue;
            }
            for (UUID next : childrenAdj.getOrDefault(current, Set.of())) {
                frontier.push(next);
            }
        }
        return false;
    }

    /**
     * Independent acyclicity check over the persisted bloodline edges, via DFS cycle detection on
     * the directed source&rarr;target graph restricted to bloodline edge types.
     */
    private static boolean isStoredBloodlineSetAcyclic(List<Relationship> store) {
        Map<UUID, Set<UUID>> adj = new HashMap<>();
        Set<UUID> nodes = new HashSet<>();
        for (Relationship r : store) {
            if (RelationshipService.TYPE_BLOODLINE_FATHER.equals(r.getType())
                    || RelationshipService.TYPE_BLOODLINE_MOTHER.equals(r.getType())) {
                adj.computeIfAbsent(r.getSourceId(), k -> new HashSet<>()).add(r.getTargetId());
                nodes.add(r.getSourceId());
                nodes.add(r.getTargetId());
            }
        }
        Set<UUID> permanent = new HashSet<>();
        Set<UUID> inStack = new HashSet<>();
        for (UUID node : nodes) {
            if (!permanent.contains(node) && hasCycle(node, adj, permanent, inStack)) {
                return false;
            }
        }
        return true;
    }

    private static boolean hasCycle(UUID node, Map<UUID, Set<UUID>> adj, Set<UUID> permanent,
            Set<UUID> inStack) {
        if (inStack.contains(node)) {
            return true;
        }
        if (permanent.contains(node)) {
            return false;
        }
        inStack.add(node);
        for (UUID next : adj.getOrDefault(node, Set.of())) {
            if (hasCycle(next, adj, permanent, inStack)) {
                return true;
            }
        }
        inStack.remove(node);
        permanent.add(node);
        return false;
    }
}
