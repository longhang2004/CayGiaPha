package com.caygiapha.familytree.dto;

/**
 * Request body for {@code PATCH /api/v1/persons/{id}} (Requirements 3.3, 3.6).
 *
 * <p>This is a <em>partial</em> update: only the fields the caller supplies are changed and all
 * unspecified fields are left unchanged. A {@code null} value for any field means "not specified"
 * (leave the stored value as-is). Each supplied field is validated against the same bounds used at
 * creation (criterion 3.2); any violation rejects the whole request and names the offending field,
 * leaving the target node unchanged.
 *
 * @param displayName new display name (1-100 chars) when present, otherwise unchanged
 * @param gender      new gender ({@code male}/{@code female}) when present, otherwise unchanged
 * @param birthOrder  new birth order (1-99) when present, otherwise unchanged
 * @param birthYear   new birth year (1000-current year) when present, otherwise unchanged
 * @param deathStatus new death status when present, otherwise unchanged
 */
public record EditPersonRequest(
        String displayName,
        String gender,
        Integer birthOrder,
        Integer birthYear,
        Boolean deathStatus) {
}
