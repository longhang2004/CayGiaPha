package com.caygiapha.familytree.dto;

import java.util.UUID;

/**
 * Request body for {@code POST /api/v1/persons} (Requirements 3.1, 3.2, 3.5, 3.6).
 *
 * <p>Field-bound validation (display name length, gender enum, birth-order/birth-year ranges) is
 * performed centrally in the {@code Graph_Store} service rather than via bean-validation
 * annotations, so that create and (partial) edit share one validation path and every rejection
 * names the offending field through {@code ApiException.validation(field, message)}.
 *
 * <p>{@code treeId} identifies the owning tree. Ownership/authorization filtering is a later task
 * (7.x); for now the tree context is supplied explicitly by the caller.
 *
 * @param treeId      owning tree the person is created in (required)
 * @param displayName display name; must be 1-100 characters
 * @param gender      gender; must be one of {@code male}, {@code female}
 * @param birthOrder  optional birth order; when present must be 1-99
 * @param birthYear   optional birth year; when present must be 1000-current year
 * @param deathStatus optional death status; defaults to {@code false} when omitted
 */
public record CreatePersonRequest(
        UUID treeId,
        String displayName,
        String gender,
        Integer birthOrder,
        Integer birthYear,
        Boolean deathStatus,
        Integer deathDay,
        Integer deathMonth,
        Integer deathYear,
        String deathCalendar,
        Boolean deathLunarLeap) {

    public CreatePersonRequest(UUID treeId, String displayName, String gender, Integer birthOrder, Integer birthYear, Boolean deathStatus) {
        this(treeId, displayName, gender, birthOrder, birthYear, deathStatus, null, null, null, "lunar", false);
    }
}
