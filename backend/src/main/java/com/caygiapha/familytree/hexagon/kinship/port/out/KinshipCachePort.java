package com.caygiapha.familytree.hexagon.kinship.port.out;

import com.caygiapha.familytree.dto.ViewpointAddressesResponse;
import java.util.Optional;
import java.util.UUID;

public interface KinshipCachePort {

    Optional<ViewpointAddressesResponse> get(UUID treeId, UUID egoId);

    void put(UUID treeId, UUID egoId, ViewpointAddressesResponse value);

    void evictTree(UUID treeId);
}
