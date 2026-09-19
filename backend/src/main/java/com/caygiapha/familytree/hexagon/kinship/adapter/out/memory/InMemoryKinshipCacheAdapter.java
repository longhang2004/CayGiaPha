package com.caygiapha.familytree.hexagon.kinship.adapter.out.memory;

import com.caygiapha.familytree.dto.ViewpointAddressesResponse;
import com.caygiapha.familytree.hexagon.kinship.port.out.KinshipCachePort;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class InMemoryKinshipCacheAdapter implements KinshipCachePort {

    private final Map<String, ViewpointAddressesResponse> values = new ConcurrentHashMap<>();

    @Override
    public Optional<ViewpointAddressesResponse> get(UUID treeId, UUID egoId) {
        return Optional.ofNullable(values.get(key(treeId, egoId)));
    }

    @Override
    public void put(UUID treeId, UUID egoId, ViewpointAddressesResponse value) {
        values.put(key(treeId, egoId), value);
    }

    @Override
    public void evictTree(UUID treeId) {
        String prefix = treeId + ":";
        values.keySet().removeIf(key -> key.startsWith(prefix));
    }

    private static String key(UUID treeId, UUID egoId) {
        return treeId + ":" + egoId;
    }
}
