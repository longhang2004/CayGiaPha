package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.Tree;
import java.util.UUID;

/**
 * Response for {@code PATCH /api/v1/trees/{treeId}/sharing} (Requirement 19.1): the tree id and its
 * sharing mode after the change.
 *
 * @param treeId  the tree whose sharing mode was changed
 * @param sharing the now-current sharing mode ({@code private}/{@code link}/{@code public})
 */
public record SharingResponse(UUID treeId, String sharing) {

    public static SharingResponse from(Tree tree) {
        return new SharingResponse(tree.getId(), tree.getSharing());
    }
}
