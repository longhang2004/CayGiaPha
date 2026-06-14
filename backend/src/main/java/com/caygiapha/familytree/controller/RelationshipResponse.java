package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.service.ConflictWarning;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.UUID;

/**
 * Response body for a created {@link Relationship}. Type-specific fields are omitted when
 * {@code null} so the payload carries only the columns relevant to the edge's type.
 *
 * <p>When creating a {@code Primitive_Bloodline_Edge} completes an unbroken bloodline path between a
 * pair previously joined by an {@code Asserted_Relationship} and the derived form of address differs
 * from the stored label, the conflicting pair surfaces in {@link #conflicts} — each entry carrying
 * both the asserted label and the derived term so the UI can warn with both values (Requirement
 * 7.5). The field is omitted entirely when no conflict was raised.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RelationshipResponse(
        UUID id,
        UUID treeId,
        String type,
        UUID sourceId,
        UUID targetId,
        String maritalStatus,
        String socialType,
        String assertedLabel,
        String derivationState,
        List<ConflictWarningResponse> conflicts) {

    /**
     * A single asserted-vs-derived conflict for an upgraded pair, exposing both the retained
     * asserted label and the newly derived term. (Requirement 7.5)
     */
    public record ConflictWarningResponse(
            UUID sourceId, UUID targetId, String assertedLabel, String derivedTerm) {

        static ConflictWarningResponse from(ConflictWarning warning) {
            return new ConflictWarningResponse(
                    warning.sourceId(),
                    warning.targetId(),
                    warning.assertedLabel(),
                    warning.derivedTerm());
        }
    }

    /** Project a persisted entity into its response representation with no conflicts. */
    public static RelationshipResponse from(Relationship edge) {
        return from(edge, List.of());
    }

    /**
     * Project a persisted entity into its response representation, attaching any conflict warnings
     * raised by the asserted-upgrade scan. An empty list is normalised to {@code null} so the
     * {@code conflicts} field is omitted from the payload when there is nothing to report.
     */
    public static RelationshipResponse from(Relationship edge, List<ConflictWarning> conflicts) {
        List<ConflictWarningResponse> mapped =
                conflicts == null || conflicts.isEmpty()
                        ? null
                        : conflicts.stream().map(ConflictWarningResponse::from).toList();
        return new RelationshipResponse(
                edge.getId(),
                edge.getTreeId(),
                edge.getType(),
                edge.getSourceId(),
                edge.getTargetId(),
                edge.getMaritalStatus(),
                edge.getSocialType(),
                edge.getAssertedLabel(),
                edge.getDerivationState(),
                mapped);
    }
}
