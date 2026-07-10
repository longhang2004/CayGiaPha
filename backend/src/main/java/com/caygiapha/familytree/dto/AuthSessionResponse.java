package com.caygiapha.familytree.dto;

import java.util.UUID;

/**
 * Current authenticated session payload returned by {@code GET /api/v1/auth/session}.
 */
public record AuthSessionResponse(
        UUID userId,
        UUID treeId,
        String identifier,
        String displayName,
        boolean verified,
        String role) {
}
