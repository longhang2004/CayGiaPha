package com.caygiapha.familytree.dto;

import java.time.Instant;
import java.util.UUID;

/** Linked claimed-node row for {@code GET /api/v1/me/nodes} (Requirement 22). */
public record SubjectNodeSummary(
        UUID personId,
        UUID treeId,
        String displayName,
        String treeName,
        Instant claimedAt) {
}
