package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.Tree;
import java.util.UUID;

/**
 * Response for {@code PATCH /api/v1/trees/{treeId}/living-redaction} (Requirement 20.4): the tree id
 * and its living-redaction setting after the change.
 *
 * @param treeId          the tree whose setting was changed
 * @param livingRedaction whether Living_Person redaction is now enabled
 */
public record LivingRedactionResponse(UUID treeId, boolean livingRedaction) {

    public static LivingRedactionResponse from(Tree tree) {
        return new LivingRedactionResponse(tree.getId(), tree.isLivingRedaction());
    }
}
