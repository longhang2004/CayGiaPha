package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.dto.ViewpointAddressesResponse;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.service.ViewpointAddressService;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Change Point of View endpoint (Requirement 10):
 *
 * <ul>
 *   <li>{@code GET /api/v1/trees/{treeId}/viewpoint/{egoId}/addresses} — the address from the
 *       selected viewpoint ({@code egoId}) toward every other person node in the tree
 *       (10.1, 10.2), each resolved to a canonical relation descriptor or the unresolved indicator
 *       (10.3).</li>
 * </ul>
 *
 * <p>This is a read: it requires an authenticated viewer (wired via the auth filter), and the
 * heavy lifting — a single-BFS all-addresses computation and rejection of a nonexistent ego while
 * leaving the current viewpoint unchanged (10.4) — lives in {@link ViewpointAddressService}.
 * A viewpoint node that is not present in the tree surfaces as {@code NODE_NOT_ACCESSIBLE} through
 * the global error envelope.
 */
@RestController
@RequestMapping("/api/v1/trees")
public class ViewpointController {

    private final ViewpointAddressService viewpointAddressService;
    private final AuthorizationService authorizationService;

    public ViewpointController(
            ViewpointAddressService viewpointAddressService,
            AuthorizationService authorizationService) {
        this.viewpointAddressService = viewpointAddressService;
        this.authorizationService = authorizationService;
    }

    @GetMapping("/{treeId}/viewpoint/{egoId}/addresses")
    public ViewpointAddressesResponse addresses(
            @PathVariable("treeId") UUID treeId,
            @PathVariable("egoId") UUID egoId,
            @RequestHeader(value = "X-Share-Token", required = false) String shareToken) {
        // 19.x — reads are gated by tree-level access (owner/linked/public/valid-link-token).
        authorizationService.requireReadAccess(treeId, shareToken);
        return viewpointAddressService.computeAddresses(treeId, egoId);
    }
}
