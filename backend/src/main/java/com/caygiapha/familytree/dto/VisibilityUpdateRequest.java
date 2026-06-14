package com.caygiapha.familytree.dto;

/**
 * Request body for {@code PATCH /api/v1/persons/{id}/visibility} (Requirements 14.1, 14.2).
 *
 * <p>Sets the per-field visibility of a person's sensitive fields. This is a <em>partial</em>
 * update: only the fields the caller supplies are changed and any field left {@code null} keeps its
 * stored value (which defaults to {@code "private"} per 14.2). Each supplied value must be exactly
 * one of {@code "private"} or {@code "public"} (14.1); any other value rejects the whole request
 * and names the offending field, leaving the node unchanged.
 *
 * @param visMarital  new visibility of marital status when present, otherwise unchanged
 * @param visAdoption new visibility of adoption status when present, otherwise unchanged
 * @param visDeath    new visibility of death status when present, otherwise unchanged
 * @param visName     new visibility of display name when present, otherwise unchanged (21.1)
 * @param visBirthYear new visibility of birth year when present, otherwise unchanged (21.1)
 * @param visPhoto    new visibility of the primary photo when present, otherwise unchanged (21.1)
 */
public record VisibilityUpdateRequest(
        String visMarital,
        String visAdoption,
        String visDeath,
        String visName,
        String visBirthYear,
        String visPhoto) {
}
