package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.security.TreeAccessRole;
import java.time.Instant;
import java.util.UUID;

/** Compact tree row used by the frontend tree list. */
public record TreeSummaryResponse(
        UUID id,
        UUID ownerUserId,
        String name,
        String region,
        String sharing,
        boolean livingRedaction,
        Instant createdAt,
        boolean isOwner,
        TreeAccessRole accessRole) {

    public static TreeSummaryResponse from(Tree tree, TreeAccessRole accessRole) {
        return new TreeSummaryResponse(
                tree.getId(),
                tree.getOwnerUserId(),
                tree.getName(),
                tree.getRegion(),
                tree.getSharing(),
                tree.isLivingRedaction(),
                tree.getCreatedAt(),
                accessRole == TreeAccessRole.OWNER,
                accessRole);
    }
}
