package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.repository.RelationshipRepository;
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

/**
 * The asserted-upgrade and conflict-detection scan (design: <em>Asserted vs Derived
 * Relationships — Upgrade and conflict-detection flow</em>, Requirement 7).
 *
 * <p>After one or more {@code Primitive_Bloodline_Edge}s are added to a tree, the {@code
 * Graph_Store} ({@link RelationshipService}) calls {@link #scanForUpgrades(UUID)}. For each
 * still-{@code asserted} edge {@code (A, B)} in the tree, the scan asks whether an <strong>unbroken
 * chain of bloodline edges</strong> now joins {@code A} and {@code B} (bloodline-only connectivity,
 * per "an unbroken chain of Primitive_Bloodline_Edges"). When it does, the scan derives the form of
 * address {@code A} uses for {@code B} from the bloodline/marriage graph and compares it to the
 * stored asserted label:
 *
 * <ul>
 *   <li><strong>Match</strong> &rarr; the edge moves to {@code verified}; the renderer draws it as a
 *       solid line and no warning is raised. (7.1, 7.3, 7.4)</li>
 *   <li><strong>Mismatch</strong> &rarr; the edge moves to {@code conflict}; the stored asserted
 *       label is <strong>retained unchanged</strong> and a {@link ConflictWarning} carrying both the
 *       asserted label and the derived term is collected for the pair. (7.1, 7.3, 7.5)</li>
 * </ul>
 *
 * <p>Only edges for which a derived term is actually resolvable are upgraded: if the pair is
 * bloodline-connected but the resolver cannot produce a defined term (an indeterminate
 * elder/younger distinction, or a relation undefined for the tree's region), the edge is left
 * asserted rather than fabricating a conflict against a term that cannot be displayed. The derived
 * comparison value is obtained from {@link KinshipAddressService#resolveDerivedAddress} so the
 * still-asserted edge does not short-circuit its own evaluation.
 *
 * <p><strong>Performance (7.2).</strong> The scan visits each asserted edge once and runs a
 * bounded bloodline-connectivity check plus a single derived resolution per connected pair over a
 * tree of up to ~1,000 nodes, completing well within the 1-second upgrade-to-solid budget.
 */
@Service
public class AssertedUpgradeService {

    /** {@code derivation_state} of an asserted edge that has not yet been completed. */
    static final String STATE_ASSERTED = "asserted";
    /** {@code derivation_state} once a completed asserted edge's term matches the label. (7.4) */
    static final String STATE_VERIFIED = "verified";
    /** {@code derivation_state} once a completed asserted edge's term differs from the label. (7.5) */
    static final String STATE_CONFLICT = "conflict";

    private final RelationshipRepository relationshipRepository;
    private final KinshipAddressService addressService;

    public AssertedUpgradeService(
            RelationshipRepository relationshipRepository, KinshipAddressService addressService) {
        this.relationshipRepository = relationshipRepository;
        this.addressService = addressService;
    }

    /**
     * Scan a tree's asserted edges for ones newly completed by an unbroken bloodline path, upgrading
     * each to {@code verified} or {@code conflict} and returning any conflict warnings produced.
     *
     * @param treeId the tree whose bloodline graph just changed
     * @return the conflicts detected during this scan; empty when none (or none are completed yet)
     */
    public List<ConflictWarning> scanForUpgrades(UUID treeId) {
        if (treeId == null) {
            return List.of();
        }

        List<Relationship> assertedEdges = new ArrayList<>();
        for (Relationship edge : relationshipRepository.findByTreeIdAndType(
                treeId, RelationshipService.TYPE_ASSERTED)) {
            if (STATE_ASSERTED.equals(edge.getDerivationState())) {
                assertedEdges.add(edge);
            }
        }
        if (assertedEdges.isEmpty()) {
            return List.of();
        }

        Map<UUID, Set<UUID>> bloodlineAdjacency = buildBloodlineAdjacency(treeId);

        List<ConflictWarning> warnings = new ArrayList<>();
        for (Relationship edge : assertedEdges) {
            UUID a = edge.getSourceId();
            UUID b = edge.getTargetId();

            // (7.1) Trigger only when an unbroken chain of bloodline edges now joins the pair.
            if (!bloodlineConnected(a, b, bloodlineAdjacency)) {
                continue;
            }

            // (7.3) Compute the derived form of address for the completed path, ignoring the
            // still-asserted edge itself.
            AddressResolution derived = addressService.resolveDerivedAddress(treeId, a, b);
            if (!derived.isResolved()) {
                // Bloodline-connected but no displayable derived term yet (indeterminate order or
                // undefined-for-region): leave it asserted rather than raise an empty conflict.
                continue;
            }

            String derivedTerm = derived.term();
            String assertedLabel = edge.getAssertedLabel();
            if (derivedTerm.equals(assertedLabel)) {
                // (7.4) Match: verify and render solid; no warning.
                edge.setDerivationState(STATE_VERIFIED);
                relationshipRepository.save(edge);
            } else {
                // (7.5) Mismatch: flag conflict, retain the asserted label, warn with both values.
                edge.setDerivationState(STATE_CONFLICT);
                relationshipRepository.save(edge);
                warnings.add(new ConflictWarning(a, b, assertedLabel, derivedTerm));
            }
        }
        return warnings;
    }

    /**
     * Build the undirected adjacency of the tree's bloodline edges (father-child and mother-child).
     * Marriage, non-bloodline, and asserted edges are excluded, so connectivity over this graph is
     * exactly "an unbroken chain of Primitive_Bloodline_Edges". (7.1)
     */
    private Map<UUID, Set<UUID>> buildBloodlineAdjacency(UUID treeId) {
        Map<UUID, Set<UUID>> adjacency = new HashMap<>();
        addUndirected(adjacency, relationshipRepository.findByTreeIdAndType(
                treeId, RelationshipService.TYPE_BLOODLINE_FATHER));
        addUndirected(adjacency, relationshipRepository.findByTreeIdAndType(
                treeId, RelationshipService.TYPE_BLOODLINE_MOTHER));
        return adjacency;
    }

    private void addUndirected(Map<UUID, Set<UUID>> adjacency, List<Relationship> edges) {
        for (Relationship edge : edges) {
            UUID source = edge.getSourceId();
            UUID target = edge.getTargetId();
            adjacency.computeIfAbsent(source, k -> new HashSet<>()).add(target);
            adjacency.computeIfAbsent(target, k -> new HashSet<>()).add(source);
        }
    }

    /**
     * Whether {@code a} and {@code b} are joined by an unbroken chain of bloodline edges, found by a
     * breadth-first walk over the undirected bloodline adjacency. (7.1)
     */
    private boolean bloodlineConnected(UUID a, UUID b, Map<UUID, Set<UUID>> adjacency) {
        if (a == null || b == null || a.equals(b)) {
            return false;
        }
        if (!adjacency.containsKey(a) || !adjacency.containsKey(b)) {
            return false;
        }
        Set<UUID> visited = new HashSet<>();
        Deque<UUID> frontier = new ArrayDeque<>();
        frontier.add(a);
        visited.add(a);
        while (!frontier.isEmpty()) {
            UUID current = frontier.poll();
            if (current.equals(b)) {
                return true;
            }
            for (UUID neighbour : adjacency.getOrDefault(current, Set.of())) {
                if (visited.add(neighbour)) {
                    frontier.add(neighbour);
                }
            }
        }
        return false;
    }
}
