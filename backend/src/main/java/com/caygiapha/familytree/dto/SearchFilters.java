package com.caygiapha.familytree.dto;

/**
 * Combinable field filters for {@code POST /api/v1/trees/{treeId}/search} (Requirement 16.3-16.5).
 *
 * <p>All fields are optional; an omitted ({@code null}) field imposes no constraint. The actual
 * filtering logic — gender, side relative to the viewpoint, birth-year range, death status, claimed
 * status, and relationship type, intersected (AND) when combined — is implemented by task 9.4.
 *
 * <p>This task (9.1) defines the shape so the request DTO is stable, and uses only
 * {@link #birthYearMin()} / {@link #birthYearMax()} to enforce the inverted-range rejection of
 * Requirement 16.8 (a lower bound greater than its upper bound).
 *
 * @param gender           optional gender filter ({@code male} / {@code female})
 * @param side             optional side relative to the viewpoint ({@code paternal} / {@code maternal})
 * @param birthYearMin     optional inclusive lower bound of the birth-year range
 * @param birthYearMax     optional inclusive upper bound of the birth-year range
 * @param deathStatus      optional death-status filter
 * @param claimedStatus    optional claimed-status filter ({@code claimed} / {@code unclaimed})
 * @param relationshipType optional relationship-type filter
 */
public record SearchFilters(
        String gender,
        String side,
        Integer birthYearMin,
        Integer birthYearMax,
        Boolean deathStatus,
        String claimedStatus,
        String relationshipType) {
}
