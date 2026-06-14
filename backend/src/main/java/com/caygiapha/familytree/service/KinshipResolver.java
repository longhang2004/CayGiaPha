package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.service.CanonicalRelation.BranchOrder;
import com.caygiapha.familytree.service.CanonicalRelation.Gender;
import com.caygiapha.familytree.service.KinshipGraphProjection.Step;
import com.caygiapha.familytree.service.KinshipGraphProjection.StepKind;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.stereotype.Component;

/**
 * Pure domain service that resolves the <em>canonical kinship relation</em> from an ego (viewpoint)
 * to a target (design: <em>Kinship_Resolver Algorithm — Steps 2 &amp; 3</em>).
 *
 * <p>This component performs the BFS path-finding (Step 2) and the canonical-relation derivation
 * (Step 3) only. It does <strong>not</strong> do region-term lookup (that is task 3.7); it produces
 * the {@link CanonicalRelation} descriptor (or an explicit unresolved indicator) and leaves
 * {@link CanonicalRelation#canonicalKey()} as the clean seam for the region layer.
 *
 * <p>It is free of I/O beyond reading the supplied {@link KinshipGraphProjection} (the projected
 * graph) and looking up {@link Person} attributes through the caller-provided lookup function,
 * which makes it directly amenable to property-based testing.
 *
 * <h2>Algorithm</h2>
 *
 * <ol>
 *   <li><strong>BFS</strong> from {@code ego} over the projection's typed adjacency steps
 *       ({@link StepKind#UP up}, {@link StepKind#DOWN down}, {@link StepKind#SPOUSE spouse}) finds
 *       the shortest kinship path to {@code target}; absence of a path is the unresolved
 *       indicator. (8.1, 8.7)</li>
 *   <li><strong>Reduce</strong> the path to the canonical descriptor: an optional trailing spouse
 *       hop, then a run of up-steps (to the meeting/branch node) followed by a run of down-steps to
 *       the target's blood endpoint. Paths that are not of this {@code UP* DOWN* SPOUSE?} shape
 *       (e.g. an in-law chain through a mid-path spouse) are reported as unresolved. (8.2)</li>
 *   <li><strong>Side</strong> comes from the first up-step leaving ego (father -> paternal,
 *       mother -> maternal); a direct descendant, a bare spouse, or ego itself is {@code SELF}.
 *       (8.3)</li>
 *   <li><strong>Elder/younger</strong> compares the two siblings at the branch — the relative's
 *       connecting ancestor versus ego's connecting parent — by birth order, falling back to birth
 *       year; if both are absent or equal the order is {@code UNKNOWN}, which makes a relation that
 *       has a sibling branch unresolved. (8.4, 8.5)</li>
 * </ol>
 */
@Component
public class KinshipResolver {

    /**
     * Resolve the canonical relation an {@code ego} uses to address a {@code target} within a tree.
     *
     * @param projection   the tree's kinship graph projection (bloodline + marriage adjacency)
     * @param egoId        the viewpoint person
     * @param targetId     the person being addressed
     * @param personLookup resolves a person id to its {@link Person} (for gender / birth data); may
     *                     return {@code null} for an unknown id
     * @return a resolved {@link CanonicalRelation} or an explicit unresolved result; never an error
     */
    public CanonicalResolution resolveCanonical(
            KinshipGraphProjection projection,
            UUID egoId,
            UUID targetId,
            Function<UUID, Person> personLookup) {

        if (projection == null || egoId == null || targetId == null || personLookup == null) {
            return CanonicalResolution.noPath();
        }

        Gender targetGender = genderOf(personLookup.apply(targetId));

        // Ego addressing itself: the trivial SELF relation. (No path needed.)
        if (egoId.equals(targetId)) {
            if (targetGender == null) {
                return CanonicalResolution.noPath();
            }
            return CanonicalResolution.resolved(new CanonicalRelation(
                    0, 0, CanonicalRelation.Side.SELF, targetGender, BranchOrder.SELF, false));
        }

        if (!projection.contains(egoId) || !projection.contains(targetId)) {
            return CanonicalResolution.noPath();
        }
        if (targetGender == null) {
            return CanonicalResolution.noPath();
        }

        List<Step> path = shortestPath(projection, egoId, targetId);
        if (path == null) {
            return CanonicalResolution.noPath(); // (8.7)
        }

        return derive(path, egoId, targetGender, personLookup);
    }

    /**
     * Resolve the canonical relation from one {@code ego} to <em>every</em> target in
     * {@code targetIds}, using a <strong>single</strong> BFS traversal of the projection (design:
     * <em>Performance (8.1, 10.2)</em> — "the resolver runs a single BFS from ego to all nodes (one
     * traversal) and derives each target's canonical relation from the BFS tree"). This is the
     * change-viewpoint all-addresses computation (task 3.12, Requirements 10.1, 10.2, 10.3).
     *
     * <p>The traversal builds the shortest-path tree rooted at {@code ego} once; each target's
     * canonical descriptor is then derived from that tree rather than re-running BFS per target.
     * Targets that are unreachable through the projection (no derived path, or absent from the
     * projection entirely) resolve to the explicit unresolved indicator (10.3); the result is
     * therefore total over {@code targetIds} and never throws.
     *
     * @param projection   the tree's kinship graph projection
     * @param egoId        the viewpoint person
     * @param targetIds    the persons to address (typically every other node in the tree)
     * @param personLookup resolves a person id to its {@link Person}; may return {@code null}
     * @return a map from each requested target id to its resolution (resolved descriptor or
     *     unresolved indicator); insertion-ordered to match {@code targetIds}
     */
    public Map<UUID, CanonicalResolution> resolveAllFrom(
            KinshipGraphProjection projection,
            UUID egoId,
            Collection<UUID> targetIds,
            Function<UUID, Person> personLookup) {

        Map<UUID, CanonicalResolution> result = new LinkedHashMap<>();
        if (targetIds == null) {
            return result;
        }
        if (projection == null || egoId == null || personLookup == null) {
            for (UUID targetId : targetIds) {
                result.put(targetId, CanonicalResolution.noPath());
            }
            return result;
        }

        // One traversal: build the shortest-path tree rooted at ego over the whole projection. (10.2)
        BfsTree tree = bfs(projection, egoId);

        for (UUID targetId : targetIds) {
            result.put(targetId, resolveFromTree(projection, tree, egoId, targetId, personLookup));
        }
        return result;
    }

    /** Derive one target's resolution from a precomputed BFS tree rooted at {@code ego}. */
    private CanonicalResolution resolveFromTree(
            KinshipGraphProjection projection,
            BfsTree tree,
            UUID egoId,
            UUID targetId,
            Function<UUID, Person> personLookup) {

        if (targetId == null) {
            return CanonicalResolution.noPath();
        }
        Gender targetGender = genderOf(personLookup.apply(targetId));

        if (egoId.equals(targetId)) {
            if (targetGender == null) {
                return CanonicalResolution.noPath();
            }
            return CanonicalResolution.resolved(new CanonicalRelation(
                    0, 0, CanonicalRelation.Side.SELF, targetGender, BranchOrder.SELF, false));
        }

        if (!projection.contains(egoId) || !projection.contains(targetId)) {
            return CanonicalResolution.noPath();
        }
        if (targetGender == null) {
            return CanonicalResolution.noPath();
        }
        if (!tree.predecessor.containsKey(targetId)) {
            return CanonicalResolution.noPath(); // unreachable in the projection (10.3)
        }

        List<Step> path = reconstruct(tree.incomingStep, tree.predecessor, egoId, targetId);
        return derive(path, egoId, targetGender, personLookup);
    }

    /**
     * Breadth-first search over the projection from {@code ego} to {@code target}. Returns the
     * ordered list of steps of the shortest path (its size is the number of edges traversed), or
     * {@code null} if {@code target} is unreachable.
     */
    private List<Step> shortestPath(KinshipGraphProjection projection, UUID ego, UUID target) {
        Map<UUID, Step> incomingStep = new HashMap<>();
        Map<UUID, UUID> predecessor = new HashMap<>();
        Deque<UUID> queue = new ArrayDeque<>();
        predecessor.put(ego, null);
        queue.add(ego);

        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            if (current.equals(target)) {
                return reconstruct(incomingStep, predecessor, ego, target);
            }
            for (Step step : projection.stepsFrom(current)) {
                UUID next = step.to();
                if (!predecessor.containsKey(next)) {
                    predecessor.put(next, current);
                    incomingStep.put(next, step);
                    queue.add(next);
                }
            }
        }
        return null;
    }

    /**
     * The shortest-path tree produced by a single BFS rooted at an ego: for every reachable node,
     * its BFS {@code predecessor} (the node it was first discovered from) and the {@link Step} taken
     * to reach it ({@code incomingStep}). The ego maps to a {@code null} predecessor.
     */
    private record BfsTree(Map<UUID, UUID> predecessor, Map<UUID, Step> incomingStep) {}

    /**
     * Breadth-first search over the whole projection from {@code ego}, building the shortest-path
     * tree (one traversal, no early termination). Reused by {@link #resolveAllFrom} so that all
     * targets are derived from a single sweep rather than a BFS per target. (10.2)
     */
    private BfsTree bfs(KinshipGraphProjection projection, UUID ego) {
        Map<UUID, Step> incomingStep = new HashMap<>();
        Map<UUID, UUID> predecessor = new HashMap<>();
        Deque<UUID> queue = new ArrayDeque<>();
        predecessor.put(ego, null);
        queue.add(ego);

        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            for (Step step : projection.stepsFrom(current)) {
                UUID next = step.to();
                if (!predecessor.containsKey(next)) {
                    predecessor.put(next, current);
                    incomingStep.put(next, step);
                    queue.add(next);
                }
            }
        }
        return new BfsTree(predecessor, incomingStep);
    }
    private List<Step> reconstruct(
            Map<UUID, Step> incomingStep, Map<UUID, UUID> predecessor, UUID ego, UUID target) {
        List<Step> reversed = new ArrayList<>();
        UUID node = target;
        while (!node.equals(ego)) {
            reversed.add(incomingStep.get(node));
            node = predecessor.get(node);
        }
        List<Step> path = new ArrayList<>(reversed.size());
        for (int i = reversed.size() - 1; i >= 0; i--) {
            path.add(reversed.get(i));
        }
        return path;
    }

    // --- Step 3: derive the canonical descriptor ----------------------------------------------

    private CanonicalResolution derive(
            List<Step> path, UUID egoId, Gender targetGender, Function<UUID, Person> personLookup) {

        // Rebuild the node sequence ego = n0, n1, ..., nm = target.
        List<UUID> nodes = new ArrayList<>(path.size() + 1);
        nodes.add(egoId);
        for (Step step : path) {
            nodes.add(step.to());
        }

        List<StepKind> kinds = new ArrayList<>(path.size());
        for (Step step : path) {
            kinds.add(step.kind());
        }

        // Optional single trailing spouse hop: target is the spouse of a blood relative.
        boolean spouseHop = false;
        int bloodEnd = nodes.size() - 1; // index of the last blood-path node
        if (!kinds.isEmpty() && kinds.get(kinds.size() - 1) == StepKind.SPOUSE) {
            spouseHop = true;
            bloodEnd = nodes.size() - 2;
        }

        // The blood path is steps[0 .. bloodEnd-1] and must be of shape UP* DOWN*.
        int upCount = 0;
        while (upCount < bloodEnd && kinds.get(upCount) == StepKind.UP) {
            upCount++;
        }
        int downCount = 0;
        int idx = upCount;
        while (idx < bloodEnd && kinds.get(idx) == StepKind.DOWN) {
            downCount++;
            idx++;
        }
        // Anything left over (a spouse hop mid-path, or a down-then-up zig-zag) is an in-law chain
        // this descriptor does not model; report it as unresolved rather than mis-encode it.
        if (idx != bloodEnd) {
            return CanonicalResolution.noPath();
        }

        CanonicalRelation.Side side = sideOf(upCount, path);

        BranchOrder branchOrder;
        if (upCount >= 1 && downCount >= 1) {
            UUID egoConnectingParent = nodes.get(upCount - 1);
            UUID relativeConnectingAncestor = nodes.get(upCount + 1);
            branchOrder = compareBranch(
                    personLookup.apply(relativeConnectingAncestor),
                    personLookup.apply(egoConnectingParent));
            // (8.5) A sibling branch whose elder/younger cannot be distinguished is unresolved.
            if (branchOrder == BranchOrder.UNKNOWN) {
                return CanonicalResolution.indeterminateOrder();
            }
        } else {
            branchOrder = BranchOrder.SELF;
        }

        return CanonicalResolution.resolved(new CanonicalRelation(
                upCount, downCount, side, targetGender, branchOrder, spouseHop));
    }

    /** Side from the first up-step leaving ego; SELF when ego does not step up. (8.3) */
    private CanonicalRelation.Side sideOf(int upCount, List<Step> steps) {
        if (upCount == 0) {
            return CanonicalRelation.Side.SELF;
        }
        Step firstUp = steps.get(0);
        Side lineageSide = firstUp.side();
        if (lineageSide == Side.PATERNAL) {
            return CanonicalRelation.Side.PATERNAL;
        }
        if (lineageSide == Side.MATERNAL) {
            return CanonicalRelation.Side.MATERNAL;
        }
        return CanonicalRelation.Side.SELF;
    }

    /**
     * Compare the relative's connecting ancestor against ego's connecting parent — the two siblings
     * at the branch point — preferring birth order and falling back to birth year. (8.4, 8.5)
     *
     * @return {@link BranchOrder#ELDER} if the relative's ancestor was born before ego's parent,
     *     {@link BranchOrder#YOUNGER} if after, {@link BranchOrder#UNKNOWN} if both birth order and
     *     birth year are absent or equal for the pair
     */
    private BranchOrder compareBranch(Person relativeAncestor, Person egoParent) {
        if (relativeAncestor == null || egoParent == null) {
            return BranchOrder.UNKNOWN;
        }

        Integer relOrder = relativeAncestor.getBirthOrder();
        Integer egoOrder = egoParent.getBirthOrder();
        if (relOrder != null && egoOrder != null && !relOrder.equals(egoOrder)) {
            return relOrder < egoOrder ? BranchOrder.ELDER : BranchOrder.YOUNGER;
        }

        Integer relYear = relativeAncestor.getBirthYear();
        Integer egoYear = egoParent.getBirthYear();
        if (relYear != null && egoYear != null && !relYear.equals(egoYear)) {
            return relYear < egoYear ? BranchOrder.ELDER : BranchOrder.YOUNGER;
        }

        return BranchOrder.UNKNOWN;
    }

    private Gender genderOf(Person person) {
        return person == null ? null : Gender.fromString(person.getGender());
    }
}
