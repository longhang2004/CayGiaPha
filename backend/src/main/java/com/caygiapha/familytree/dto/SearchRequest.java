package com.caygiapha.familytree.dto;

import java.util.UUID;

/**
 * Request body for {@code POST /api/v1/trees/{treeId}/search} (Requirement 16, design
 * <em>Search_Service</em>): {@code { nameQuery?, addressQuery?, viewpointId?, filters? }}.
 *
 * <p>All fields are optional. {@code nameQuery} drives the case-folded, diacritic-insensitive
 * substring match (16.1); {@code addressQuery} drives the exact-match against the computed
 * {@code Form_Of_Address} relative to {@code viewpointId} (16.2); {@code filters} carries the
 * combinable field filters (16.3-16.5, implemented by task 9.4). When more than one criterion is
 * supplied the results are intersected (AND).
 *
 * <p>Query validation (empty / over-100-character query, inverted birth-year range) is performed in
 * the {@code Search_Service} and surfaces field-named rejections through the global error envelope
 * (16.8).
 *
 * @param nameQuery    optional display-name query (1-100 characters when present)
 * @param addressQuery optional {@code Form_Of_Address} query (exact match, relative to the viewpoint)
 * @param viewpointId  the viewpoint person for address search (required when {@code addressQuery} is set)
 * @param filters      optional combinable field filters
 */
public record SearchRequest(
        String nameQuery,
        String addressQuery,
        UUID viewpointId,
        SearchFilters filters) {
}
