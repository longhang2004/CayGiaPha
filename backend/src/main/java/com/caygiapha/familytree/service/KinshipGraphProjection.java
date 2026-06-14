package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.Relationship;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Immutable in-memory projection of a tree's kinship graph (design: <em>Kinship_Resolver
 * Algorithm — Step 1</em>). It contains <strong>only</strong> the edges that participate in
 * kinship derivation:
 *
 * <ul>
 *   <li><strong>Bloodline edges</strong> ({@code bloodline_father}, {@code bloodline_mother})
 *       produce child &harr; parent adjacency. Each link is tagged with its {@link ParentType}
 *       (father/mother), which carries the lineage {@link Side} (father -> paternal, mother ->
 *       maternal) and the direction (up = toward a parent/ancestor, down = toward a
 *       child/descendant).</li>
 *   <li><strong>Marriage edges</strong> ({@code marriage}) produce an undirected spouse
 *       adjacency.</li>
 * </ul>
 *
 * <p>{@code non_bloodline} and {@code asserted} edges are <strong>excluded entirely</strong> from
 * the projection, so they never contribute to any path computation. (Requirements 6.4, 12.3)
 *
 * <p>The node set contains exactly the persons touched by an included edge; persons connected only
 * by excluded edges (or not connected at all) do not appear here and are therefore unreachable
 * through the projection, which the resolver reports as the unresolved indicator.
 *
 * <p>This class is a pure data structure: it performs no I/O and no Vietnamese-term lookup (that is
 * a later resolver concern). Building and per-tree caching are handled by
 * {@link KinshipGraphProjectionCache}.
 */
public final class KinshipGraphProjection {

    /** A parent of a node, with the role (father/mother) by which it is that node's parent. */
    public record ParentLink(UUID parentId, ParentType parentType) {
        /** The lineage side contributed by this parent link. */
        public Side side() {
            return parentType.side();
        }
    }

    /** A child of a node, with the role by which this node is that child's parent. */
    public record ChildLink(UUID childId, ParentType parentType) {
        /** The lineage side contributed by this child link. */
        public Side side() {
            return parentType.side();
        }
    }

    /** The kind of adjacency step taken when traversing the projection. */
    public enum StepKind {
        /** Move up to a parent/ancestor (along a bloodline edge, against its direction). */
        UP,
        /** Move down to a child/descendant (along a bloodline edge, in its direction). */
        DOWN,
        /** Move sideways to a spouse (along an undirected marriage edge). */
        SPOUSE
    }

    /**
     * A single adjacency step from one node to a neighbour. {@code parentType} (and thus the
     * {@link Side}) is present for {@link StepKind#UP} and {@link StepKind#DOWN} steps and
     * {@code null} for {@link StepKind#SPOUSE} steps.
     */
    public record Step(UUID to, StepKind kind, ParentType parentType) {
        /** The lineage side for bloodline steps, or {@code null} for spouse steps. */
        public Side side() {
            return parentType == null ? null : parentType.side();
        }
    }

    private final UUID treeId;
    private final Map<UUID, List<ParentLink>> parents;
    private final Map<UUID, List<ChildLink>> children;
    private final Map<UUID, Set<UUID>> spouses;
    private final Set<UUID> nodes;

    private KinshipGraphProjection(
            UUID treeId,
            Map<UUID, List<ParentLink>> parents,
            Map<UUID, List<ChildLink>> children,
            Map<UUID, Set<UUID>> spouses,
            Set<UUID> nodes) {
        this.treeId = treeId;
        this.parents = parents;
        this.children = children;
        this.spouses = spouses;
        this.nodes = nodes;
    }

    /**
     * Build a projection from a tree's relationship edges. Only bloodline and marriage edges are
     * loaded; {@code non_bloodline}, {@code asserted}, and any unrecognised types are skipped.
     *
     * @param treeId the tree the edges belong to
     * @param edges  all edges of the tree (the method filters them)
     * @return an immutable projection containing only derivation-relevant adjacency
     */
    public static KinshipGraphProjection fromEdges(UUID treeId, Collection<Relationship> edges) {
        Map<UUID, List<ParentLink>> parents = new HashMap<>();
        Map<UUID, List<ChildLink>> children = new HashMap<>();
        Map<UUID, Set<UUID>> spouses = new HashMap<>();
        Set<UUID> nodes = new LinkedHashSet<>();

        for (Relationship edge : edges) {
            String type = edge.getType();
            if (type == null) {
                continue;
            }
            switch (type) {
                case RelationshipService.TYPE_BLOODLINE_FATHER ->
                        addBloodline(parents, children, nodes, edge, ParentType.FATHER);
                case RelationshipService.TYPE_BLOODLINE_MOTHER ->
                        addBloodline(parents, children, nodes, edge, ParentType.MOTHER);
                case RelationshipService.TYPE_MARRIAGE -> addMarriage(spouses, nodes, edge);
                default -> {
                    // non_bloodline, asserted, and any unknown type are excluded from all path
                    // computation (Requirements 6.4, 12.3).
                }
            }
        }

        return new KinshipGraphProjection(
                treeId,
                freezeLists(parents),
                freezeLists(children),
                freezeSets(spouses),
                Collections.unmodifiableSet(nodes));
    }

    private static void addBloodline(
            Map<UUID, List<ParentLink>> parents,
            Map<UUID, List<ChildLink>> children,
            Set<UUID> nodes,
            Relationship edge,
            ParentType parentType) {
        UUID parentId = edge.getSourceId();
        UUID childId = edge.getTargetId();
        parents.computeIfAbsent(childId, k -> new ArrayList<>())
                .add(new ParentLink(parentId, parentType));
        children.computeIfAbsent(parentId, k -> new ArrayList<>())
                .add(new ChildLink(childId, parentType));
        nodes.add(parentId);
        nodes.add(childId);
    }

    private static void addMarriage(
            Map<UUID, Set<UUID>> spouses, Set<UUID> nodes, Relationship edge) {
        UUID a = edge.getSourceId();
        UUID b = edge.getTargetId();
        spouses.computeIfAbsent(a, k -> new LinkedHashSet<>()).add(b);
        spouses.computeIfAbsent(b, k -> new LinkedHashSet<>()).add(a);
        nodes.add(a);
        nodes.add(b);
    }

    private static <T> Map<UUID, List<T>> freezeLists(Map<UUID, List<T>> map) {
        Map<UUID, List<T>> frozen = new HashMap<>();
        map.forEach((k, v) -> frozen.put(k, Collections.unmodifiableList(v)));
        return Collections.unmodifiableMap(frozen);
    }

    private static Map<UUID, Set<UUID>> freezeSets(Map<UUID, Set<UUID>> map) {
        Map<UUID, Set<UUID>> frozen = new HashMap<>();
        map.forEach((k, v) -> frozen.put(k, Collections.unmodifiableSet(v)));
        return Collections.unmodifiableMap(frozen);
    }

    /** The tree this projection was built for. */
    public UUID treeId() {
        return treeId;
    }

    /** All nodes that participate in at least one bloodline or marriage edge. */
    public Set<UUID> nodes() {
        return nodes;
    }

    /** Whether the node participates in the projection (i.e. has any derivation-relevant edge). */
    public boolean contains(UUID nodeId) {
        return nodes.contains(nodeId);
    }

    /** The parents of a node (0, 1, or 2 links); empty if the node has no recorded parent. */
    public List<ParentLink> parentsOf(UUID nodeId) {
        return parents.getOrDefault(nodeId, List.of());
    }

    /** The children of a node; empty if the node has none. */
    public List<ChildLink> childrenOf(UUID nodeId) {
        return children.getOrDefault(nodeId, List.of());
    }

    /** The spouses of a node (undirected); empty if the node has none. */
    public Set<UUID> spousesOf(UUID nodeId) {
        return spouses.getOrDefault(nodeId, Set.of());
    }

    /**
     * All adjacency steps leaving a node, combining up-to-parent, down-to-child, and spouse
     * neighbours into the typed {@link Step} form used by the resolver's BFS (tasks 3.3, 3.12).
     */
    public List<Step> stepsFrom(UUID nodeId) {
        List<Step> steps = new ArrayList<>();
        for (ParentLink parent : parentsOf(nodeId)) {
            steps.add(new Step(parent.parentId(), StepKind.UP, parent.parentType()));
        }
        for (ChildLink child : childrenOf(nodeId)) {
            steps.add(new Step(child.childId(), StepKind.DOWN, child.parentType()));
        }
        for (UUID spouse : spousesOf(nodeId)) {
            steps.add(new Step(spouse, StepKind.SPOUSE, null));
        }
        return steps;
    }
}
