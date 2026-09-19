package com.caygiapha.familytree.hexagon.kinship.adapter.in.web;

import com.caygiapha.familytree.dto.ViewpointAddressesResponse;
import com.caygiapha.familytree.hexagon.kinship.port.in.KinshipQueryUseCase;
import com.caygiapha.familytree.security.AuthorizationService;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform/trees/{treeId}/kinship")
public class KinshipQueryController {

    private final KinshipQueryUseCase kinshipQueryUseCase;
    private final AuthorizationService authorizationService;

    public KinshipQueryController(
            KinshipQueryUseCase kinshipQueryUseCase, AuthorizationService authorizationService) {
        this.kinshipQueryUseCase = kinshipQueryUseCase;
        this.authorizationService = authorizationService;
    }

    @GetMapping("/{egoId}")
    public ViewpointAddressesResponse resolve(
            @PathVariable UUID treeId, @PathVariable UUID egoId) {
        authorizationService.requireReadAccess(treeId, null);
        return kinshipQueryUseCase.resolveFromEgo(treeId, egoId);
    }
}
