package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.security.AuthorizationService;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Region-change domain logic for the {@code Kinship_Resolver}'s configurable region setting
 * (Requirements 9.5, 9.6). Backs {@code PATCH /api/v1/trees/{treeId}/region}.
 *
 * <p>Behaviour:
 * <ul>
 *   <li>The change is owner-only — {@link AuthorizationService#requireOwner} rejects any non-owner
 *       caller (13.4) before anything is read or written.</li>
 *   <li>The new region must be one of {@code Bac}/{@code Trung}/{@code Nam}; any other value is
 *       rejected with a field-level {@code VALIDATION_ERROR} and the tree's stored region is left
 *       unchanged (9.6). Because the method is a {@link Mutation}, the rejection throws before the
 *       write and persists nothing.</li>
 *   <li>On success the tree's region is persisted; the resolver reads {@link Tree#getRegion()} at
 *       resolve time, so every {@code Form_Of_Address} computed after the change uses the new
 *       region (9.5).</li>
 * </ul>
 */
@Service
public class TreeRegionService {

    private final TreeRepository treeRepository;
    private final AuthorizationService authorizationService;

    public TreeRegionService(
            TreeRepository treeRepository, AuthorizationService authorizationService) {
        this.treeRepository = treeRepository;
        this.authorizationService = authorizationService;
    }

    /**
     * Change the tree's default region after authorizing the owner and validating the value.
     *
     * @param treeId the tree to update
     * @param region the requested region key ({@code Bac}/{@code Trung}/{@code Nam})
     * @return the persisted tree carrying its new region
     * @throws ApiException {@code NOT_AUTHORIZED} when the caller is not the tree owner (13.4);
     *     {@code NODE_NOT_ACCESSIBLE} when the tree does not exist; {@code VALIDATION_ERROR} when
     *     {@code region} is not one of the three accepted values (9.6, region left unchanged)
     */
    @Mutation
    public Tree changeRegion(UUID treeId, String region) {
        // 13.4 — owner-only; a non-owner is rejected before any read or write.
        authorizationService.requireOwner(treeId);

        Tree tree = treeRepository
                .findById(treeId)
                .orElseThrow(() -> ApiException.nodeNotAccessible(
                        "The specified tree was not found."));

        // 9.6 — reject any value outside {Bac, Trung, Nam}; the @Mutation transaction (and the
        // throw-before-write order) guarantees the previously stored region is retained.
        if (!Tree.isValidRegion(region)) {
            throw ApiException.validation(
                    "region", "Region must be one of Bac, Trung, or Nam.");
        }

        // 9.5 — persist; subsequent resolution reads Tree.region and uses the new region.
        tree.setRegion(region);
        return treeRepository.save(tree);
    }
}
