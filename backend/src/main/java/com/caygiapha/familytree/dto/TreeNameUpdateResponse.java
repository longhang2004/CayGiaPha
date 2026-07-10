package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.Tree;
import java.util.UUID;

/** Response returned after changing a tree name. */
public record TreeNameUpdateResponse(UUID treeId, String name) {
    public static TreeNameUpdateResponse from(Tree tree) {
        return new TreeNameUpdateResponse(tree.getId(), tree.getName());
    }
}
