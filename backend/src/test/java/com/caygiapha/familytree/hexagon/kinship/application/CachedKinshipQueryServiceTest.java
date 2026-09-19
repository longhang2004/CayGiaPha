package com.caygiapha.familytree.hexagon.kinship.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.ViewpointAddressesResponse;
import com.caygiapha.familytree.hexagon.kinship.port.out.KinshipCachePort;
import com.caygiapha.familytree.platform.outbox.GraphMutatedEvent;
import com.caygiapha.familytree.service.ViewpointAddressService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CachedKinshipQueryServiceTest {

    @Test
    void usesCacheThenFallsBackToResolver() {
        ViewpointAddressService viewpointAddressService = mock(ViewpointAddressService.class);
        KinshipCachePort cache = mock(KinshipCachePort.class);
        CachedKinshipQueryService service = new CachedKinshipQueryService(viewpointAddressService, cache);
        UUID treeId = UUID.randomUUID();
        UUID egoId = UUID.randomUUID();
        ViewpointAddressesResponse computed = new ViewpointAddressesResponse(egoId, List.of());
        when(cache.get(treeId, egoId)).thenReturn(Optional.empty());
        when(viewpointAddressService.computeAddresses(treeId, egoId)).thenReturn(computed);

        assertThat(service.resolveFromEgo(treeId, egoId)).isEqualTo(computed);
        verify(cache).put(treeId, egoId, computed);

        when(cache.get(treeId, egoId)).thenReturn(Optional.of(computed));
        assertThat(service.resolveFromEgo(treeId, egoId)).isEqualTo(computed);
        verify(viewpointAddressService).computeAddresses(treeId, egoId);
    }

    @Test
    void evictsTreeOnGraphMutation() {
        KinshipCachePort cache = mock(KinshipCachePort.class);
        CachedKinshipQueryService service =
                new CachedKinshipQueryService(mock(ViewpointAddressService.class), cache);
        UUID treeId = UUID.randomUUID();

        service.onGraphMutated(GraphMutatedEvent.edgeCreated(treeId, UUID.randomUUID(), "bloodline_father"));

        verify(cache).evictTree(treeId);
        verify(cache, never()).put(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }
}
