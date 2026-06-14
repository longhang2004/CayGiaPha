package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.dto.LivingRedactionRequest;
import com.caygiapha.familytree.dto.LivingRedactionResponse;
import com.caygiapha.familytree.dto.RegionChangeRequest;
import com.caygiapha.familytree.dto.RegionChangeResponse;
import com.caygiapha.familytree.dto.SharingResponse;
import com.caygiapha.familytree.dto.SharingUpdateRequest;
import com.caygiapha.familytree.dto.ShareTokenResponse;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.service.AuditService;
import com.caygiapha.familytree.service.TreeRegionService;
import com.caygiapha.familytree.service.TreeSharingService;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tree-level configuration endpoints (Requirements 9.5, 9.6, 19.1, 19.5, 19.8):
 *
 * <ul>
 *   <li>{@code PATCH  /api/v1/trees/{treeId}/region}       — change the tree's default region;
 *       owner-only, {@code Bac}/{@code Trung}/{@code Nam} only, previous region retained on an
 *       invalid value.</li>
 *   <li>{@code PATCH  /api/v1/trees/{treeId}/sharing}      — set sharing private/link/public;
 *       owner-only. (19.1, 19.8)</li>
 *   <li>{@code POST   /api/v1/trees/{treeId}/share-token}  — issue a share token (revoking the
 *       prior one), returned once; owner-only. (19.5)</li>
 *   <li>{@code DELETE /api/v1/trees/{treeId}/share-token}  — revoke the active share token;
 *       owner-only. (19.5)</li>
 * </ul>
 *
 * <p>Authorization (owner-only) and value validation live in the services; rejections surface
 * through the global error envelope with their declared HTTP status.
 */
@RestController
@RequestMapping("/api/v1/trees")
public class TreeController {

    private final TreeRegionService treeRegionService;
    private final TreeSharingService treeSharingService;
    private final AuditService auditService;

    public TreeController(
            TreeRegionService treeRegionService,
            TreeSharingService treeSharingService,
            AuditService auditService) {
        this.treeRegionService = treeRegionService;
        this.treeSharingService = treeSharingService;
        this.auditService = auditService;
    }

    @PatchMapping("/{treeId}/region")
    public RegionChangeResponse changeRegion(
            @PathVariable("treeId") UUID treeId, @RequestBody RegionChangeRequest request) {
        Tree tree = treeRegionService.changeRegion(treeId, request.region());
        return RegionChangeResponse.from(tree);
    }

    @PatchMapping("/{treeId}/sharing")
    public SharingResponse changeSharing(
            @PathVariable("treeId") UUID treeId, @RequestBody SharingUpdateRequest request) {
        Tree tree = treeSharingService.changeSharing(treeId, request.sharing());
        auditService.record(AuditService.SHARING_CHANGED, "tree", treeId, tree.getSharing()); // 25.2
        return SharingResponse.from(tree);
    }

    @PostMapping("/{treeId}/share-token")
    public ShareTokenResponse issueShareToken(@PathVariable("treeId") UUID treeId) {
        String token = treeSharingService.issueShareToken(treeId);
        auditService.record(AuditService.SHARE_TOKEN_ISSUED, "tree", treeId); // 25.2 (no token logged)
        return new ShareTokenResponse(treeId, token);
    }

    @DeleteMapping("/{treeId}/share-token")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeShareToken(@PathVariable("treeId") UUID treeId) {
        treeSharingService.revokeShareToken(treeId);
        auditService.record(AuditService.SHARE_TOKEN_REVOKED, "tree", treeId); // 25.2
    }

    @PatchMapping("/{treeId}/living-redaction")
    public LivingRedactionResponse setLivingRedaction(
            @PathVariable("treeId") UUID treeId, @RequestBody LivingRedactionRequest request) {
        Tree tree = treeSharingService.setLivingRedaction(treeId, request.enabled());
        auditService.record(AuditService.LIVING_REDACTION_CHANGED, "tree", treeId,
                String.valueOf(tree.isLivingRedaction())); // 25.2
        return LivingRedactionResponse.from(tree);
    }
}
