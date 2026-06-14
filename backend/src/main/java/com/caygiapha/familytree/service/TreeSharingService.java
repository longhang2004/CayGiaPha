package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.security.AuthorizationService;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Owner-only tree sharing controls (Requirement 19.1, 19.5, 19.8). Backs
 * {@code PATCH /api/v1/trees/{treeId}/sharing} and the share-token endpoints.
 *
 * <p>All operations are owner-only — {@link AuthorizationService#requireOwner} rejects any
 * non-owner before any read or write (19.8). The sharing mode must be one of
 * {@code private}/{@code link}/{@code public}; any other value is rejected with a field-level
 * {@code VALIDATION_ERROR} and the stored mode is left unchanged. Share-token mechanics (generation,
 * hashing, revocation) are delegated to {@link ShareTokenService}.
 */
@Service
public class TreeSharingService {

    private final TreeRepository treeRepository;
    private final AuthorizationService authorizationService;
    private final ShareTokenService shareTokenService;

    public TreeSharingService(
            TreeRepository treeRepository,
            AuthorizationService authorizationService,
            ShareTokenService shareTokenService) {
        this.treeRepository = treeRepository;
        this.authorizationService = authorizationService;
        this.shareTokenService = shareTokenService;
    }

    /**
     * Set the tree's sharing mode after authorizing the owner and validating the value.
     *
     * @throws ApiException {@code NOT_AUTHORIZED} when the caller is not the owner (19.8);
     *     {@code NODE_NOT_ACCESSIBLE} when the tree does not exist; {@code VALIDATION_ERROR} when
     *     {@code sharing} is not one of the three accepted modes (mode left unchanged)
     */
    @Mutation
    public Tree changeSharing(UUID treeId, String sharing) {
        authorizationService.requireOwner(treeId); // 19.8

        Tree tree = treeRepository
                .findById(treeId)
                .orElseThrow(() -> ApiException.nodeNotAccessible(
                        "The specified tree was not found."));

        if (!Tree.isValidSharing(sharing)) {
            throw ApiException.validation(
                    "sharing", "Sharing must be one of private, link, or public.");
        }

        tree.setSharing(sharing);
        return treeRepository.save(tree);
    }

    /**
     * Issue a fresh share token for the tree (owner-only), returning the plaintext token shown once.
     * (19.5)
     */
    @Mutation
    public String issueShareToken(UUID treeId) {
        authorizationService.requireOwner(treeId); // 19.8
        requireTreeExists(treeId);
        return shareTokenService.issueToken(treeId);
    }

    /** Revoke the tree's active share token (owner-only). (19.5) */
    @Mutation
    public void revokeShareToken(UUID treeId) {
        authorizationService.requireOwner(treeId); // 19.8
        requireTreeExists(treeId);
        shareTokenService.revokeToken(treeId);
    }

    /**
     * Enable or disable Living_Person redaction for the tree (owner-only). (Requirement 20.4)
     *
     * @throws ApiException {@code NOT_AUTHORIZED} when the caller is not the owner;
     *     {@code NODE_NOT_ACCESSIBLE} when the tree does not exist
     */
    @Mutation
    public Tree setLivingRedaction(UUID treeId, boolean enabled) {
        authorizationService.requireOwner(treeId); // owner-only (20.4)
        Tree tree = treeRepository
                .findById(treeId)
                .orElseThrow(() -> ApiException.nodeNotAccessible(
                        "The specified tree was not found."));
        tree.setLivingRedaction(enabled);
        return treeRepository.save(tree);
    }

    private void requireTreeExists(UUID treeId) {
        if (!treeRepository.existsById(treeId)) {
            throw ApiException.nodeNotAccessible("The specified tree was not found.");
        }
    }
}
