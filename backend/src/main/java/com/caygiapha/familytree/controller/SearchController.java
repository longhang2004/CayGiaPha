package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.dto.SearchRequest;
import com.caygiapha.familytree.dto.SearchResponse;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.service.SearchResultRedactor;
import com.caygiapha.familytree.service.SearchService;
import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code Search_Service} endpoint (Requirement 16, design <em>Search_Service</em>):
 *
 * <ul>
 *   <li>{@code POST /api/v1/trees/{treeId}/search} — body
 *       {@code { nameQuery?, addressQuery?, viewpointId?, filters? }}; returns the matched persons
 *       and a no-matches indication (16.1, 16.2, 16.6), rejecting invalid queries / ranges (16.8).
 *       </li>
 * </ul>
 *
 * <p>Search is a read: it requires an authenticated viewer (consistent with the other read
 * endpoints' auth wiring). Query/range validation, name matching, and address matching live in
 * {@link SearchService} and surface through the global error envelope.
 */
@RestController
@RequestMapping("/api/v1/trees")
public class SearchController {

    private final SearchService searchService;
    private final SearchResultRedactor searchResultRedactor;
    private final AuthorizationService authorizationService;

    public SearchController(
            SearchService searchService,
            SearchResultRedactor searchResultRedactor,
            AuthorizationService authorizationService) {
        this.searchService = searchService;
        this.searchResultRedactor = searchResultRedactor;
        this.authorizationService = authorizationService;
    }

    @PostMapping("/{treeId}/search")
    public SearchResponse search(
            @PathVariable("treeId") UUID treeId,
            @RequestBody SearchRequest request,
            @RequestHeader(value = "X-Share-Token", required = false) String shareToken) {
        // 19.x — reads are gated by tree-level access (owner/linked/public/valid-link-token).
        authorizationService.requireReadAccess(treeId, shareToken);
        SearchResponse response = searchService.search(treeId, request);
        // 20.2/21.4 — redact living/name-private people's names for a non-privileged viewer, and
        // keep hidden names undiscoverable by name search.
        return searchResultRedactor.redact(treeId, response, request.nameQuery() != null);
    }
}
