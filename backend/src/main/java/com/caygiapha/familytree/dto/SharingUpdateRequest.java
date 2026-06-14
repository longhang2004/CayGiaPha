package com.caygiapha.familytree.dto;

/**
 * Request body for {@code PATCH /api/v1/trees/{treeId}/sharing} (Requirement 19.1, 19.8).
 *
 * <p>Carries the new sharing mode, one of {@code private}, {@code link}, or {@code public}. Any
 * other value is rejected by the service with a field-level {@code VALIDATION_ERROR} naming the
 * {@code sharing} field, leaving the stored mode unchanged.
 *
 * @param sharing the requested sharing mode
 */
public record SharingUpdateRequest(String sharing) {
}
