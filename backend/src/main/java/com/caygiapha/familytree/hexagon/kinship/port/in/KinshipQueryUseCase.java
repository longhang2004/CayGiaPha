package com.caygiapha.familytree.hexagon.kinship.port.in;

import com.caygiapha.familytree.dto.ViewpointAddressesResponse;
import java.util.UUID;

public interface KinshipQueryUseCase {

    ViewpointAddressesResponse resolveFromEgo(UUID treeId, UUID egoId);
}
