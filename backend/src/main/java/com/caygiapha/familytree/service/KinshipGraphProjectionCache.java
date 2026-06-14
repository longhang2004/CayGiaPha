package com.caygiapha.familytree.service;

import com.caygiapha.familytree.repository.RelationshipRepository;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Builds and caches a {@link KinshipGraphProjection} per tree (design: <em>Kinship_Resolver
 * Algorithm — Step 1</em> and <em>Performance</em>).
 *
 * <p>Because kinship address computation is read-only and runs against the projection, building it
 * once per tree and reusing it across requests avoids reloading and re-walking the edge set on
 * every resolve. The cache is keyed by {@code treeId} and is the projection-side counterpart to
 * the resolver and viewpoint endpoints (tasks 3.3, 3.12).
 *
 * <p><strong>Invalidation.</strong> Any edge mutation can change connectivity, so edge-mutation
 * code MUST call {@link #evict(UUID)} (or {@link #evictAll()}) after a successful change to drop
 * the stale projection; the next read rebuilds it lazily. This keeps the cache consistent with the
 * stored graph without the projection itself knowing about persistence.
 */
@Component
public class KinshipGraphProjectionCache {

    private final RelationshipRepository relationshipRepository;
    private final ConcurrentMap<UUID, KinshipGraphProjection> cache = new ConcurrentHashMap<>();

    public KinshipGraphProjectionCache(RelationshipRepository relationshipRepository) {
        this.relationshipRepository = relationshipRepository;
    }

    /**
     * Return the cached projection for a tree, building it (and caching it) on first access.
     *
     * @param treeId the tree to project
     * @return the tree's kinship graph projection
     */
    public KinshipGraphProjection getProjection(UUID treeId) {
        return cache.computeIfAbsent(treeId, this::build);
    }

    /**
     * Build a fresh projection for a tree directly from the stored edges, bypassing the cache.
     * Useful for callers that need a snapshot independent of cache state (and used internally by
     * {@link #getProjection(UUID)}).
     */
    public KinshipGraphProjection build(UUID treeId) {
        return KinshipGraphProjection.fromEdges(
                treeId, relationshipRepository.findByTreeId(treeId));
    }

    /**
     * Drop the cached projection for a tree. Edge-mutation code calls this after any successful
     * create/update/delete of a relationship so the next read rebuilds from the current graph.
     *
     * @param treeId the tree whose projection should be invalidated
     */
    public void evict(UUID treeId) {
        if (treeId != null) {
            cache.remove(treeId);
        }
    }

    /** Drop every cached projection (e.g. for tests or a global reset). */
    public void evictAll() {
        cache.clear();
    }

    /** Whether a projection for the tree is currently cached (test/diagnostic helper). */
    boolean isCached(UUID treeId) {
        return cache.containsKey(treeId);
    }
}
