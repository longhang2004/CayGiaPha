package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.Tree;
import java.util.UUID;

/**
 * Response for {@code PATCH /api/v1/trees/{treeId}/region} (Requirement 9.5): the tree id and its
 * region after the change. Subsequent address resolution reads {@link Tree#getRegion()} at resolve
 * time, so this reflects the region every later {@code Form_Of_Address} will be computed under.
 *
 * @param treeId the tree whose region was changed
 * @param region the now-current region key ({@code Bac}/{@code Trung}/{@code Nam})
 */
public record RegionChangeResponse(UUID treeId, String region) {

    /** Build the response from the persisted {@link Tree}. */
    public static RegionChangeResponse from(Tree tree) {
        return new RegionChangeResponse(tree.getId(), tree.getRegion());
    }
}
