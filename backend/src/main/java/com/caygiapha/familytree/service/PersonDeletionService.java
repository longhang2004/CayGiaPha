package com.caygiapha.familytree.service;

import com.caygiapha.familytree.dto.DeletionChoiceResponse;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.KinshipGraphProjection.Step;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Two-phase {@code Person} node deletion for the {@code Graph_Store} (Requirement 15).
 *
 * <p>Deletion is split so the Owner can choose what happens to neighbors before anything is
 * removed:
 *
 * <ol>
 *   <li><strong>Phase 1 — prompt.</strong> {@link #beginDeletion} validates the target exists and
 *       returns the two-option choice ({@code cascade} / {@code preserve}); it makes no change to
 *       the Graph_Store (15.1, 15.2). A nonexistent target is rejected as
 *       {@code NODE_NOT_ACCESSIBLE} (3.4, 15.10).</li>
 *   <li><strong>Phase 2 — execute.</strong> {@link #deleteCascade} runs the chosen strategy
 *       atomically. This service implements both the <em>cascade</em> strategy (15.3) and the
 *       <em>neighbor preservation</em> strategy (15.4-15.9).</li>
 * </ol>
 *
 * <p><strong>Cascade algorithm (15.3).</strong> Remove the target and every edge connected to it,
 * then repeatedly remove every <em>other</em> node that retains zero edges <em>as a result</em> of
 * the removal, until no node that became edgeless through this operation remains. This is a
 * worklist sweep over the live edge set: when a node is removed, each surviving neighbor loses an
 * incident edge; a neighbor whose remaining incident-edge count drops to zero became edgeless
 * through the cascade and is itself removed (which may in turn drop further neighbors to zero).
 *
 * <p>Pre-existing isolates are retained: a node that already had zero edges before the deletion is
 * never a neighbor of any removed node, so the sweep never reaches it (15.3, "as a result").
 */
@Service
public class PersonDeletionService {

    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final KinshipGraphProjectionCache projectionCache;
    private final KinshipAddressService kinshipAddressService;
    private final RelationshipService relationshipService;

    public PersonDeletionService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            KinshipGraphProjectionCache projectionCache,
            KinshipAddressService kinshipAddressService,
            RelationshipService relationshipService) {
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.projectionCache = projectionCache;
        this.kinshipAddressService = kinshipAddressService;
        this.relationshipService = relationshipService;
    }

    /**
     * Phase 1: present the two-option deletion choice for a target node without mutating anything
     * (Requirements 3.4, 15.1, 15.2). A target absent from the tree is rejected (3.4/15.10).
     *
     * @param treeId   the owner's tree
     * @param personId the node the Owner asked to delete
     * @return the two-option choice
     * @throws ApiException {@code NODE_NOT_ACCESSIBLE} when the target is not in the tree
     */
    @Transactional(readOnly = true)
    public DeletionChoiceResponse beginDeletion(UUID treeId, UUID personId) {
        requirePerson(treeId, personId);
        return DeletionChoiceResponse.forPerson(personId);
    }

    /**
     * Phase 2 dispatch: execute the deletion with the Owner-selected {@code strategy}
     * (Requirements 15.3, 15.4). A {@code null} or unrecognized strategy is rejected as a
     * validation error naming the {@code strategy} field, leaving the Graph_Store unchanged.
     *
     * @param treeId   the owner's tree
     * @param personId the target node to delete
     * @param strategy one of {@code cascade} or {@code preserve}
     * @throws ApiException {@code VALIDATION_ERROR} for an unknown strategy, or
     *                      {@code NODE_NOT_ACCESSIBLE} when the target is not in the tree
     */
    @Mutation
    public void execute(UUID treeId, UUID personId, String strategy) {
        if (DeletionChoiceResponse.STRATEGY_CASCADE.equals(strategy)) {
            deleteCascade(treeId, personId);
        } else if (DeletionChoiceResponse.STRATEGY_PRESERVE.equals(strategy)) {
            deletePreserve(treeId, personId);
        } else {
            throw ApiException.validation(
                    "strategy", "Deletion strategy must be one of cascade or preserve.");
        }
    }

    /**
     * Phase 2, neighbor-preservation strategy (Requirements 15.4-15.9).
     *
     * <p><strong>Algorithm (design: "Neighbor preservation (15.4, 15.5, 15.7, 15.8)").</strong>
     *
     * <ol>
     *   <li><strong>Before</strong> removing anything, identify the target's neighbors that are
     *       connected to it by a {@code Derived_Relationship} (bloodline/marriage) — exactly the
     *       neighbors visible in the tree's kinship-graph projection, which excludes
     *       {@code non_bloodline}/{@code asserted} edges. For each unordered pair {@code (A, B)} of
     *       such neighbors, compute the pre-deletion {@code Form_Of_Address} from {@code A} to
     *       {@code B} via the address layer (using the tree's region) and remember it. (15.5)</li>
     *   <li>Remove the target node and every edge incident to it. (15.4)</li>
     *   <li>Retain <strong>all</strong> former neighbors, even those left with zero edges; they are
     *       never cascade-removed. (15.4, 15.8)</li>
     *   <li>For each neighbor pair {@code (A, B)}: if the target was a <em>cut node</em> for that
     *       pair — i.e. with the target removed, {@code A} and {@code B} are no longer connected by
     *       any derived path (their only derived path ran through the target) — <strong>and</strong>
     *       the pre-deletion address from {@code A} to {@code B} was <em>defined</em>
     *       ({@link AddressResolution.Status#RESOLVED}), create an {@code Asserted_Relationship}
     *       {@code A -> B} labeled with that pre-deletion address. (15.5) Pairs whose pre-deletion
     *       address was undefined are skipped (15.7), as are pairs still joined by another derived
     *       path (no asserted edge is needed). (15.5)</li>
     * </ol>
     *
     * <p><strong>Label direction.</strong> One asserted edge is created per unordered pair, in the
     * direction {@code A -> B} where {@code A} is the earlier of the two neighbors in iteration
     * order, labeled with the address {@code A} uses for {@code B}. Address symmetry (Requirement
     * 8.6) guarantees the reverse address resolves to the inverse term, so a single edge per pair
     * captures the retained kinship.
     *
     * <p>The created edges are ordinary {@code asserted} edges (dashed render, 15.6) produced
     * through {@link RelationshipService}, so a later unbroken bloodline path completing the pair
     * triggers the same upgrade/conflict flow as any other asserted edge (15.9).
     *
     * @param treeId   the owner's tree
     * @param personId the target node to delete
     * @throws ApiException {@code NODE_NOT_ACCESSIBLE} when the target is not in the tree
     */
    @Mutation
    public void deletePreserve(UUID treeId, UUID personId) {
        requirePerson(treeId, personId);

        List<Relationship> edges = relationshipRepository.findByTreeId(treeId);

        // (15.5) Step 1 — BEFORE any mutation, find the target's derived neighbors (the projection
        // contains only bloodline/marriage edges) and compute the pre-deletion address for every
        // unordered pair, while the cached projection still reflects the pre-deletion graph.
        KinshipGraphProjection preProjection = projectionCache.getProjection(treeId);
        List<UUID> derivedNeighbors = new ArrayList<>();
        Set<UUID> seenNeighbors = new HashSet<>();
        for (Step step : preProjection.stepsFrom(personId)) {
            UUID neighbor = step.to();
            if (!neighbor.equals(personId) && seenNeighbors.add(neighbor)) {
                derivedNeighbors.add(neighbor);
            }
        }

        // Pre-deletion address (A -> B) for each unordered neighbor pair, keyed by ordered (A, B).
        record NeighborPair(UUID a, UUID b) {}
        Map<NeighborPair, String> definedAddresses = new HashMap<>();
        for (int i = 0; i < derivedNeighbors.size(); i++) {
            for (int j = i + 1; j < derivedNeighbors.size(); j++) {
                UUID a = derivedNeighbors.get(i);
                UUID b = derivedNeighbors.get(j);
                AddressResolution resolution = kinshipAddressService.resolveAddress(treeId, a, b);
                // (15.7) Only a defined (RESOLVED) address yields an asserted edge; an
                // undefined-for-region or unresolved address means no edge for this pair.
                if (resolution.status() == AddressResolution.Status.RESOLVED) {
                    definedAddresses.put(new NeighborPair(a, b), resolution.term());
                }
            }
        }

        // (15.4) Step 2 — remove the target node and every edge incident to it.
        List<Relationship> incidentEdges = new ArrayList<>();
        for (Relationship edge : edges) {
            if (personId.equals(edge.getSourceId()) || personId.equals(edge.getTargetId())) {
                incidentEdges.add(edge);
            }
        }
        if (!incidentEdges.isEmpty()) {
            relationshipRepository.deleteAll(incidentEdges);
        }
        relationshipRepository.flush();

        // (15.4, 15.8) Step 3 — retain all former neighbors (even isolated ones): only the target
        // node itself is removed; no cascade sweep runs.
        personRepository
                .findByIdAndTreeId(personId, treeId)
                .ifPresent(personRepository::delete);

        // Connectivity changed; drop the stale cached projection before re-deriving connectivity.
        projectionCache.evict(treeId);

        // (15.5) Step 4 — build the post-deletion derived graph (edges not incident to the target)
        // and, for each pair whose only derived path ran through the target (now disconnected) and
        // whose pre-deletion address was defined, create the labeled asserted edge.
        Set<Relationship> removed = new HashSet<>(incidentEdges);
        List<Relationship> survivingEdges = new ArrayList<>();
        for (Relationship edge : edges) {
            if (!removed.contains(edge)) {
                survivingEdges.add(edge);
            }
        }
        KinshipGraphProjection postProjection =
                KinshipGraphProjection.fromEdges(treeId, survivingEdges);

        for (Map.Entry<NeighborPair, String> entry : definedAddresses.entrySet()) {
            UUID a = entry.getKey().a();
            UUID b = entry.getKey().b();
            // The target was a cut node for (A, B) iff they are no longer derived-connected.
            if (!derivedConnected(postProjection, a, b)) {
                relationshipService.createRelationship(new CreateRelationshipCommand(
                        treeId,
                        RelationshipService.TYPE_ASSERTED,
                        a,
                        b,
                        null,
                        null,
                        entry.getValue()));
            }
        }
    }

    /**
     * Whether {@code from} can reach {@code to} over derived (bloodline/marriage) adjacency in the
     * given projection. Used to decide whether the deleted target was a cut node for a neighbor
     * pair: if the two neighbors are no longer derived-connected after the target's removal, their
     * only derived path ran through the target (15.5).
     */
    private boolean derivedConnected(KinshipGraphProjection projection, UUID from, UUID to) {
        if (from.equals(to)) {
            return true;
        }
        Set<UUID> visited = new HashSet<>();
        Deque<UUID> frontier = new ArrayDeque<>();
        frontier.add(from);
        visited.add(from);
        while (!frontier.isEmpty()) {
            UUID current = frontier.poll();
            for (Step step : projection.stepsFrom(current)) {
                UUID next = step.to();
                if (next.equals(to)) {
                    return true;
                }
                if (visited.add(next)) {
                    frontier.add(next);
                }
            }
        }
        return false;
    }

    /**
     * Phase 2, cascade strategy (Requirement 15.3): remove the target node and all its edges, then
     * transitively remove every other node that became edgeless as a result, retaining
     * pre-existing isolates. A nonexistent target is rejected (15.10).
     *
     * @param treeId   the owner's tree
     * @param personId the target node to delete
     * @throws ApiException {@code NODE_NOT_ACCESSIBLE} when the target is not in the tree
     */
    @Mutation
    public void deleteCascade(UUID treeId, UUID personId) {
        requirePerson(treeId, personId);

        List<Relationship> edges = relationshipRepository.findByTreeId(treeId);

        // Live incident-edge count per node, and an incident-neighbor list (one neighbor entry per
        // incident edge, so multi-edges decrement the count the correct number of times).
        Map<UUID, Integer> degree = new HashMap<>();
        Map<UUID, List<UUID>> neighbors = new HashMap<>();
        for (Relationship edge : edges) {
            UUID a = edge.getSourceId();
            UUID b = edge.getTargetId();
            degree.merge(a, 1, Integer::sum);
            degree.merge(b, 1, Integer::sum);
            neighbors.computeIfAbsent(a, k -> new ArrayList<>()).add(b);
            neighbors.computeIfAbsent(b, k -> new ArrayList<>()).add(a);
        }

        // Worklist sweep: start by removing the target; each removal strips an incident edge from
        // every surviving neighbor, and any neighbor that thereby reaches zero edges is removed too.
        Set<UUID> removed = new HashSet<>();
        Deque<UUID> worklist = new ArrayDeque<>();
        removed.add(personId);
        worklist.add(personId);
        while (!worklist.isEmpty()) {
            UUID current = worklist.poll();
            for (UUID neighbor : neighbors.getOrDefault(current, List.of())) {
                if (removed.contains(neighbor)) {
                    // The edge between two removed nodes is gone; don't double-count it.
                    continue;
                }
                int remaining = degree.merge(neighbor, -1, Integer::sum);
                if (remaining <= 0) {
                    // The neighbor only had edges into the removed set, so it became edgeless as a
                    // result of this cascade (it cannot be a pre-existing isolate — it was a
                    // neighbor of a removed node). Remove it and continue the sweep.
                    removed.add(neighbor);
                    worklist.add(neighbor);
                }
            }
        }

        // Remove every edge incident to any removed node (this covers the target's edges and the
        // edges of every cascade-orphan), then remove the nodes themselves.
        List<Relationship> edgesToRemove = new ArrayList<>();
        for (Relationship edge : edges) {
            if (removed.contains(edge.getSourceId()) || removed.contains(edge.getTargetId())) {
                edgesToRemove.add(edge);
            }
        }
        if (!edgesToRemove.isEmpty()) {
            relationshipRepository.deleteAll(edgesToRemove);
        }
        relationshipRepository.flush();

        List<Person> personsToRemove = new ArrayList<>();
        for (UUID id : removed) {
            personRepository.findByIdAndTreeId(id, treeId).ifPresent(personsToRemove::add);
        }
        personRepository.deleteAll(personsToRemove);

        // Connectivity changed, so the tree's cached kinship-graph projection is now stale.
        projectionCache.evict(treeId);
    }

    private Person requirePerson(UUID treeId, UUID personId) {
        if (treeId == null || personId == null) {
            throw ApiException.nodeNotAccessible("The target node is not accessible.");
        }
        return personRepository
                .findByIdAndTreeId(personId, treeId)
                .orElseThrow(() ->
                        ApiException.nodeNotAccessible("The target node is not accessible."));
    }
}
