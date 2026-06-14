package com.caygiapha.familytree.dto;

/**
 * Request body for {@code PATCH /api/v1/trees/{treeId}/living-redaction} (Requirement 20.4).
 *
 * <p>Toggles whether Living_Person details are redacted from non-privileged viewers for the tree.
 *
 * @param enabled {@code true} to enable redaction (the default), {@code false} to disable it
 */
public record LivingRedactionRequest(boolean enabled) {
}
