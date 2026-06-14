package com.caygiapha.familytree.service;

import com.caygiapha.familytree.dto.PersonResponse;
import com.caygiapha.familytree.dto.PersonVisibility;
import com.caygiapha.familytree.dto.SearchResponse;
import com.caygiapha.familytree.dto.SearchResponse.SearchResult;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.security.AuthorizationService.Role;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Applies Living_Person and per-field name redaction to {@code Search_Service} results for the
 * current viewer (Requirements 20.2, 21.4), closing the gap whereby a non-privileged authorized
 * viewer (public/link/another tree's linked member) could otherwise read living or name-private
 * people's display names through search.
 *
 * <p>For each result the viewer's privilege is classified per person (the owner is privileged for
 * all; a linked user only for their own node). A name is redacted when the viewer is non-privileged
 * and either the tree's Living_Person redaction applies to a living person or the person's
 * {@code vis_name} is {@code private}.
 *
 * <p>To prevent <em>name enumeration</em>, a person whose name is redacted is <strong>dropped</strong>
 * from a result set that was produced by a name query (the viewer must not be able to confirm a
 * hidden name by searching for it); when the match came from filters or an address query instead,
 * the person is retained but their name is replaced with the placeholder.
 */
@Service
public class SearchResultRedactor {

    private final PersonRepository personRepository;
    private final TreeRepository treeRepository;
    private final AuthorizationService authorizationService;
    private final LivingPersonPolicy livingPersonPolicy;

    public SearchResultRedactor(
            PersonRepository personRepository,
            TreeRepository treeRepository,
            AuthorizationService authorizationService,
            LivingPersonPolicy livingPersonPolicy) {
        this.personRepository = personRepository;
        this.treeRepository = treeRepository;
        this.authorizationService = authorizationService;
        this.livingPersonPolicy = livingPersonPolicy;
    }

    /**
     * Redact names in the search response for the current viewer.
     *
     * @param treeId        the searched tree
     * @param response      the raw search results (real names)
     * @param nameSearchUsed whether the search included a name query (drives enumeration protection)
     * @return a response with names redacted, and hidden-name persons dropped from name searches
     */
    @Transactional(readOnly = true)
    public SearchResponse redact(UUID treeId, SearchResponse response, boolean nameSearchUsed) {
        boolean livingRedaction =
                treeRepository.findById(treeId).map(Tree::isLivingRedaction).orElse(true);

        List<SearchResult> out = new ArrayList<>();
        for (SearchResult result : response.results()) {
            Person person =
                    personRepository.findByIdAndTreeId(result.personId(), treeId).orElse(null);
            boolean privileged =
                    authorizationService.classify(treeId, result.personId()) != Role.NEITHER;
            boolean redactName = person != null && !privileged
                    && ((livingRedaction && livingPersonPolicy.isLiving(person))
                            || PersonVisibility.PRIVATE.equals(person.getVisName()));

            if (redactName) {
                if (nameSearchUsed) {
                    continue; // 20.2/21.4 — a hidden name must not be discoverable by name search.
                }
                out.add(new SearchResult(
                        result.personId(), PersonResponse.REDACTED_NAME_PLACEHOLDER));
            } else {
                out.add(result);
            }
        }
        return SearchResponse.of(out);
    }
}
