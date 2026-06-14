package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.service.RelationshipService.CreateRelationshipCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Request body for {@code POST /api/v1/relationships}: create a typed edge between two persons.
 *
 * <p>Only the structural fields are required by bean validation; type-specific fields
 * ({@code maritalStatus}, {@code socialType}, {@code assertedLabel}) and the value/enum bounds are
 * validated in the service layer so each violation maps to its precise error code (self-reference,
 * missing-node, parent-limit, or field validation).
 *
 * @param treeId        owning tree of both endpoints (edges never cross trees)
 * @param type          discriminator: {@code bloodline_father}, {@code bloodline_mother},
 *                      {@code marriage}, {@code non_bloodline}, or {@code asserted}
 * @param sourceId      source endpoint (parent for bloodline edges)
 * @param targetId      target endpoint (child for bloodline edges)
 * @param maritalStatus marriage edges only: one of {@code married, divorced, deceased}
 * @param socialType    non-bloodline edges only: one of {@code friend, teacher, colleague}
 * @param assertedLabel asserted edges only: a kinship label of 1-50 characters
 */
public record CreateRelationshipRequest(
        @NotNull(message = "treeId is required.") UUID treeId,
        @NotBlank(message = "type is required.") String type,
        @NotNull(message = "sourceId is required.") UUID sourceId,
        @NotNull(message = "targetId is required.") UUID targetId,
        String maritalStatus,
        String socialType,
        String assertedLabel) {

    /** Convert this web DTO to the service-layer command. */
    public CreateRelationshipCommand toCommand() {
        return new CreateRelationshipCommand(
                treeId, type, sourceId, targetId, maritalStatus, socialType, assertedLabel);
    }
}
