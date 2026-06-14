package com.caygiapha.familytree.dto;

import java.util.UUID;

/**
 * Response body for {@code POST /api/v1/persons}: carries the identifier of the created person
 * node (Requirement 3.1, "return the identifier of the created node").
 *
 * @param id the identifier of the newly created person node
 */
public record CreatedPersonResponse(UUID id) {
}
