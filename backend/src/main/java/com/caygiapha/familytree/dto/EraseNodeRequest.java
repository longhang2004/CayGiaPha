package com.caygiapha.familytree.dto;

/**
 * Request body for {@code POST /api/v1/me/nodes/{personId}/erase} (Requirement 22.3).
 *
 * @param strategy {@code delete} (remove the node, preserving relatives) or {@code anonymize}
 *                 (overwrite identifying fields and detach the claim)
 */
public record EraseNodeRequest(String strategy) {
}
