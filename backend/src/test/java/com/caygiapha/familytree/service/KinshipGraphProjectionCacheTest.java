package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.repository.RelationshipRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link KinshipGraphProjectionCache} — per-tree projection caching and the
 * cache-invalidation hook edge mutations call (design: <em>Performance</em>). A mocked
 * {@link RelationshipRepository} lets the tests count how often the edge set is reloaded.
 */
class KinshipGraphProjectionCacheTest {

    @Test
    void getProjectionBuildsOnceAndCachesAcrossReads() {
        UUID tree = UUID.randomUUID();
        UUID father = UUID.randomUUID();
        UUID child = UUID.randomUUID();
        RelationshipRepository repository = mock(RelationshipRepository.class);
        when(repository.findByTreeId(tree)).thenReturn(
                List.of(new Relationship(tree, "bloodline_father", father, child)));

        KinshipGraphProjectionCache cache = new KinshipGraphProjectionCache(repository);

        KinshipGraphProjection first = cache.getProjection(tree);
        KinshipGraphProjection second = cache.getProjection(tree);

        // Same cached instance returned; edges loaded only once.
        assertThat(second).isSameAs(first);
        assertThat(cache.isCached(tree)).isTrue();
        assertThat(first.parentsOf(child)).hasSize(1);
        verify(repository, times(1)).findByTreeId(tree);
    }

    @Test
    void evictForcesRebuildOnNextRead() {
        UUID tree = UUID.randomUUID();
        RelationshipRepository repository = mock(RelationshipRepository.class);
        when(repository.findByTreeId(tree)).thenReturn(List.of());

        KinshipGraphProjectionCache cache = new KinshipGraphProjectionCache(repository);

        KinshipGraphProjection first = cache.getProjection(tree);
        cache.evict(tree);
        assertThat(cache.isCached(tree)).isFalse();
        KinshipGraphProjection rebuilt = cache.getProjection(tree);

        // After eviction a fresh projection is built (distinct instance) and edges reloaded.
        assertThat(rebuilt).isNotSameAs(first);
        verify(repository, times(2)).findByTreeId(tree);
    }

    @Test
    void evictAllClearsEveryCachedTree() {
        UUID treeA = UUID.randomUUID();
        UUID treeB = UUID.randomUUID();
        RelationshipRepository repository = mock(RelationshipRepository.class);
        when(repository.findByTreeId(treeA)).thenReturn(List.of());
        when(repository.findByTreeId(treeB)).thenReturn(List.of());

        KinshipGraphProjectionCache cache = new KinshipGraphProjectionCache(repository);
        cache.getProjection(treeA);
        cache.getProjection(treeB);
        assertThat(cache.isCached(treeA)).isTrue();
        assertThat(cache.isCached(treeB)).isTrue();

        cache.evictAll();

        assertThat(cache.isCached(treeA)).isFalse();
        assertThat(cache.isCached(treeB)).isFalse();
    }

    @Test
    void buildBypassesCache() {
        UUID tree = UUID.randomUUID();
        RelationshipRepository repository = mock(RelationshipRepository.class);
        when(repository.findByTreeId(tree)).thenReturn(List.of());

        KinshipGraphProjectionCache cache = new KinshipGraphProjectionCache(repository);

        KinshipGraphProjection built = cache.build(tree);

        assertThat(built.treeId()).isEqualTo(tree);
        // A direct build does not populate the cache.
        assertThat(cache.isCached(tree)).isFalse();
    }

    @Test
    void evictWithNullTreeIdIsANoOp() {
        RelationshipRepository repository = mock(RelationshipRepository.class);
        KinshipGraphProjectionCache cache = new KinshipGraphProjectionCache(repository);

        cache.evict(null);

        assertThat(cache.isCached(UUID.randomUUID())).isFalse();
    }
}
