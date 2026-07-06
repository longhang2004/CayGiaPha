package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.Tree;
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
        boolean isOwner) {

    public static TreeSummaryResponse from(Tree tree, boolean isOwner) {
        return new TreeSummaryResponse(
                tree.getId(),
                tree.getOwnerUserId(),
                tree.getName(),
                tree.getRegion(),
                tree.getSharing(),
                tree.isLivingRedaction(),
                tree.getCreatedAt(),
                isOwner);
    }
}
