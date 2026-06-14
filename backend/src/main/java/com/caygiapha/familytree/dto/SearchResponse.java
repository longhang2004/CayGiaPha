package com.caygiapha.familytree.dto;

import java.util.List;
import java.util.UUID;

/**
 * Response body for {@code POST /api/v1/trees/{treeId}/search} (Requirement 16.1, 16.2, 16.6).
 *
 * <p>Carries the matched person nodes and an explicit {@code noMatches} indication. When no person
 * satisfies the submitted query (and applied filters), {@link #results()} is empty and
 * {@link #noMatches()} is {@code true} — the no-matches indication required by 16.6.
 *
 * @param results   the matched persons (all and only the persons satisfying the search)
 * @param noMatches {@code true} iff {@code results} is empty (the no-matches indication, 16.6)
 */
public record SearchResponse(List<SearchResult> results, boolean noMatches) {

    /** Build a response from the matched results, deriving the no-matches indication. */
    public static SearchResponse of(List<SearchResult> results) {
        return new SearchResponse(results, results.isEmpty());
    }

    /**
     * A single matched person.
     *
     * @param personId    the matched person's id
     * @param displayName the matched person's display name
     */
    public record SearchResult(UUID personId, String displayName) {}
}
