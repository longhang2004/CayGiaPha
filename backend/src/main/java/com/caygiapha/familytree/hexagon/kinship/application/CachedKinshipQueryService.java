package com.caygiapha.familytree.hexagon.kinship.application;

import com.caygiapha.familytree.dto.ViewpointAddressesResponse;
import com.caygiapha.familytree.hexagon.kinship.port.in.KinshipQueryUseCase;
import com.caygiapha.familytree.hexagon.kinship.port.out.KinshipCachePort;
import com.caygiapha.familytree.platform.outbox.GraphMutatedEvent;
import com.caygiapha.familytree.service.ViewpointAddressService;
import java.util.UUID;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
public class CachedKinshipQueryService implements KinshipQueryUseCase {

    private final ViewpointAddressService viewpointAddressService;
    private final KinshipCachePort cache;

    public CachedKinshipQueryService(
            ViewpointAddressService viewpointAddressService, KinshipCachePort cache) {
        this.viewpointAddressService = viewpointAddressService;
        this.cache = cache;
    }

    @Override
    public ViewpointAddressesResponse resolveFromEgo(UUID treeId, UUID egoId) {
        return cache.get(treeId, egoId).orElseGet(() -> {
            ViewpointAddressesResponse computed = viewpointAddressService.computeAddresses(treeId, egoId);
            cache.put(treeId, egoId, computed);
            return computed;
        });
    }

    @EventListener
    public void onGraphMutated(GraphMutatedEvent event) {
        cache.evictTree(event.treeId());
    }
}
