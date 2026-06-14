package com.caygiapha.familytree.dto;

/**
 * Request body for the second phase of deletion,
 * {@code POST /api/v1/persons/{id}/delete} (Requirements 15.3, 15.4).
 *
 * <p>The Owner echoes back one of the two strategies presented by the first-phase
 * {@link DeletionChoiceResponse}: {@code "cascade"} (cascade deletion, 15.3) or {@code "preserve"}
 * (neighbor preservation, 15.4). Any other value is rejected as a validation error naming the
 * {@code strategy} field.
 *
 * @param strategy the chosen deletion strategy, one of {@code cascade} or {@code preserve}
 */
public record DeletePersonRequest(String strategy) {
}
