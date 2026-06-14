package com.caygiapha.familytree.service;

import com.caygiapha.familytree.dto.SearchFilters;
import com.caygiapha.familytree.dto.SearchRequest;
import com.caygiapha.familytree.dto.SearchResponse;
import com.caygiapha.familytree.dto.SearchResponse.SearchResult;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@code Search_Service} — name and address search plus combinable field filters over the persons
 * of a tree (Requirement 16, design <em>Search_Service</em>).
 *
 * <p>Task 9.1 implemented name search (16.1), address search (16.2), the no-matches indication
 * (16.6), and query/range validation (16.8). This task (9.4) adds the <strong>combinable field
 * filters</strong> of 16.3-16.5:
 *
 * <ul>
 *   <li><strong>gender</strong> — the person's {@code gender} equals the filter ({@code male} /
 *       {@code female}).</li>
 *   <li><strong>side</strong> (16.3) — the person's canonical relation from the viewpoint is on the
 *       {@code paternal} or {@code maternal} side. The canonical side is derived via
 *       {@link KinshipAddressService#resolveDerivedAddress} (so a direct asserted edge never
 *       short-circuits it). A person whose relation is unresolved or {@code SELF} matches no
 *       paternal/maternal side filter. Like address search, a side filter requires a viewpoint.</li>
 *   <li><strong>birth-year range</strong> — the person's {@code birthYear} lies within the
 *       inclusive {@code [min, max]} bounds (each bound optional). A person with a {@code null}
 *       {@code birthYear} does <em>not</em> match a range filter that constrains it (i.e. when a
 *       bound is present), because an unknown year cannot be shown to fall inside the range.</li>
 *   <li><strong>death status</strong> — the person's {@code deathStatus} equals the filter.</li>
 *   <li><strong>claimed status</strong> — whether the person is a {@code Claimed_Node}
 *       ({@code claimed} / {@code unclaimed}), via {@link ClaimService#isClaimed}.</li>
 *   <li><strong>relationship type</strong> — the person <em>participates in at least one</em> edge
 *       of the given type ({@code bloodline_father} / {@code bloodline_mother} / {@code marriage} /
 *       {@code non_bloodline} / {@code asserted}) as either endpoint, via
 *       {@link RelationshipRepository#findBySourceIdOrTargetId}.</li>
 * </ul>
 *
 * <p><strong>Intersection (AND) and monotonicity (16.4, 16.5).</strong> Every supplied criterion —
 * name, address, and each field filter — is a predicate the person must satisfy; the result is the
 * intersection of the per-criterion result sets. Because the criteria are combined as a pure
 * conjunction, dropping any one filter can only admit more persons, so each result set is a subset
 * of the one obtained by removing a filter (the monotonicity property checked by Property 25).
 *
 * <p><strong>Filter-value validation (16.8 style).</strong> Enum-valued filters are validated and
 * an invalid value is rejected with {@code VALIDATION_ERROR} naming the offending field: gender
 * ({@code male}/{@code female}), side ({@code paternal}/{@code maternal}), claimedStatus
 * ({@code claimed}/{@code unclaimed}), and relationshipType (one of the five edge types). The
 * inverted birth-year range remains rejected as in 9.1.
 *
 * <p>Like the other read endpoints, search requires an authenticated viewer (wired in the
 * controller). A nonexistent viewpoint — required for an address search or a side filter — is
 * rejected as {@code NODE_NOT_ACCESSIBLE}.
 */
@Service
public class SearchService {

    /** Maximum allowed query length (16.1: 1-100 characters; 16.8 rejects over-100). */
    private static final int MAX_QUERY_LENGTH = 100;

    /** Allowed gender filter values (16.3). */
    private static final Set<String> GENDERS = Set.of("male", "female");

    /** Allowed side filter values relative to the viewpoint (16.3). */
    private static final String SIDE_PATERNAL = "paternal";
    private static final String SIDE_MATERNAL = "maternal";
    private static final Set<String> SIDES = Set.of(SIDE_PATERNAL, SIDE_MATERNAL);

    /** Allowed claimed-status filter values (16.3). */
    private static final String CLAIMED = "claimed";
    private static final String UNCLAIMED = "unclaimed";
    private static final Set<String> CLAIMED_STATUSES = Set.of(CLAIMED, UNCLAIMED);

    /** Allowed relationship-type filter values (16.3) — the five stored edge types. */
    private static final Set<String> RELATIONSHIP_TYPES = Set.of(
            RelationshipService.TYPE_BLOODLINE_FATHER,
            RelationshipService.TYPE_BLOODLINE_MOTHER,
            RelationshipService.TYPE_MARRIAGE,
            RelationshipService.TYPE_NON_BLOODLINE,
            RelationshipService.TYPE_ASSERTED);

    private final PersonRepository personRepository;
    private final KinshipAddressService kinshipAddressService;
    private final ClaimService claimService;
    private final RelationshipRepository relationshipRepository;

    public SearchService(
            PersonRepository personRepository,
            KinshipAddressService kinshipAddressService,
            ClaimService claimService,
            RelationshipRepository relationshipRepository) {
        this.personRepository = personRepository;
        this.kinshipAddressService = kinshipAddressService;
        this.claimService = claimService;
        this.relationshipRepository = relationshipRepository;
    }

    /**
     * Execute a name/address search with combinable field filters within {@code treeId}.
     *
     * @param treeId  the tree to search within
     * @param request the search criteria (name query, address query + viewpoint, field filters)
     * @return the matched persons and the no-matches indication (16.6)
     * @throws ApiException {@code VALIDATION_ERROR} for an empty/over-100 query, an inverted range,
     *                      or an invalid filter value (16.8); {@code NODE_NOT_ACCESSIBLE} for a
     *                      nonexistent viewpoint required by address search or a side filter
     */
    @Transactional(readOnly = true)
    public SearchResponse search(UUID treeId, SearchRequest request) {
        String nameQuery = request.nameQuery();
        String addressQuery = request.addressQuery();
        SearchFilters filters = request.filters();
        UUID viewpointId = request.viewpointId();

        // 16.8 — reject empty / over-100-character queries, naming the offending field.
        validateQuery("nameQuery", nameQuery);
        validateQuery("addressQuery", addressQuery);

        // 16.8 — reject an inverted birth-year range, and validate enum-valued filter values.
        validateBirthYearRange(filters);
        validateFilterValues(filters);

        // Address search and the side filter are both relative to a viewpoint; require and validate
        // it up front when either is used (16.2, 16.3).
        boolean needsViewpoint = addressQuery != null || hasSideFilter(filters);
        if (needsViewpoint) {
            if (viewpointId == null) {
                throw ApiException.validation(
                        "viewpointId", "A viewpoint is required for address or side search.");
            }
            if (treeId == null || !personRepository.existsByIdAndTreeId(viewpointId, treeId)) {
                throw ApiException.nodeNotAccessible(
                        "The selected viewpoint node is not in the tree.");
            }
        }

        List<Person> persons =
                treeId == null ? List.of() : personRepository.findByTreeId(treeId);

        List<SearchResult> results = new ArrayList<>();
        for (Person person : persons) {
            // 16.4 — a person must satisfy every supplied criterion (intersection / AND).
            if (nameQuery != null && !NameNormalizer.containsNormalized(
                    person.getDisplayName(), nameQuery)) {
                continue;
            }
            if (addressQuery != null
                    && !addressMatches(treeId, viewpointId, person.getId(), addressQuery)) {
                continue;
            }
            if (!matchesFilters(treeId, viewpointId, person, filters)) {
                continue;
            }
            results.add(new SearchResult(person.getId(), person.getDisplayName()));
        }

        // 16.6 — empty result set carries the no-matches indication.
        return SearchResponse.of(results);
    }

    /**
     * Whether {@code person} satisfies every supplied field filter (16.3, 16.4). An omitted
     * ({@code null}) filter imposes no constraint; combined filters are intersected (AND), so the
     * predicate is a pure conjunction and removing any filter only grows the result set (16.5).
     */
    private boolean matchesFilters(
            UUID treeId, UUID viewpointId, Person person, SearchFilters filters) {
        if (filters == null) {
            return true;
        }
        if (filters.gender() != null && !matchesGender(person, filters.gender())) {
            return false;
        }
        if (hasSideFilter(filters)
                && !matchesSide(treeId, viewpointId, person.getId(), filters.side())) {
            return false;
        }
        if (!matchesBirthYearRange(person, filters.birthYearMin(), filters.birthYearMax())) {
            return false;
        }
        if (filters.deathStatus() != null
                && person.isDeathStatus() != filters.deathStatus()) {
            return false;
        }
        if (filters.claimedStatus() != null
                && !matchesClaimedStatus(person.getId(), filters.claimedStatus())) {
            return false;
        }
        if (filters.relationshipType() != null
                && !matchesRelationshipType(person.getId(), filters.relationshipType())) {
            return false;
        }
        return true;
    }

    /** Gender filter: the person's stored gender equals the (case-insensitive) filter value. */
    private boolean matchesGender(Person person, String gender) {
        return person.getGender() != null
                && person.getGender().equalsIgnoreCase(gender.trim());
    }

    /**
     * Side filter (16.3): the canonical relation from the viewpoint toward the person is on the
     * requested paternal/maternal side. The canonical side is derived (asserted edges never
     * short-circuit), so a person reached only through an asserted label, or with no resolvable
     * path, or who is the viewpoint itself ({@code SELF}), matches no side filter.
     */
    private boolean matchesSide(UUID treeId, UUID viewpointId, UUID personId, String side) {
        AddressResolution resolution =
                kinshipAddressService.resolveDerivedAddress(treeId, viewpointId, personId);
        CanonicalResolution canonical = resolution.canonical();
        if (canonical == null) {
            return false;
        }
        return canonical.canonicalRelation()
                .map(relation -> matchesSide(relation.side(), side))
                .orElse(false);
    }

    private boolean matchesSide(CanonicalRelation.Side actual, String requested) {
        return switch (actual) {
            case PATERNAL -> SIDE_PATERNAL.equals(requested);
            case MATERNAL -> SIDE_MATERNAL.equals(requested);
            case SELF -> false;
        };
    }

    /**
     * Birth-year range filter (16.3): the person's birth year lies within the inclusive bounds.
     * Each bound is optional. A person with an unknown ({@code null}) birth year does not match a
     * range that constrains it — an unknown year cannot be shown to fall inside the range — but an
     * unconstrained range (both bounds absent) imposes nothing and matches everyone.
     */
    private boolean matchesBirthYearRange(Person person, Integer min, Integer max) {
        if (min == null && max == null) {
            return true;
        }
        Integer birthYear = person.getBirthYear();
        if (birthYear == null) {
            return false;
        }
        if (min != null && birthYear < min) {
            return false;
        }
        return max == null || birthYear <= max;
    }

    /** Claimed-status filter: whether the person's claimed state matches the requested value. */
    private boolean matchesClaimedStatus(UUID personId, String claimedStatus) {
        boolean claimed = claimService.isClaimed(personId);
        return CLAIMED.equals(claimedStatus) ? claimed : !claimed;
    }

    /**
     * Relationship-type filter (16.3): whether the person participates in at least one edge of the
     * requested type, as either the source or the target endpoint.
     */
    private boolean matchesRelationshipType(UUID personId, String relationshipType) {
        for (Relationship edge :
                relationshipRepository.findBySourceIdOrTargetId(personId, personId)) {
            if (relationshipType.equals(edge.getType())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Whether the {@code Form_Of_Address} from {@code viewpointId} toward {@code targetId} equals
     * {@code addressQuery} exactly (16.2). A target with no defined address (unresolved / undefined
     * for region) never matches.
     */
    private boolean addressMatches(
            UUID treeId, UUID viewpointId, UUID targetId, String addressQuery) {
        AddressResolution resolution =
                kinshipAddressService.resolveAddress(treeId, viewpointId, targetId);
        return resolution.formOfAddress().map(addressQuery::equals).orElse(false);
    }

    /** 16.8 — a present query must be 1-100 characters; reject empty or over-100. */
    private void validateQuery(String field, String query) {
        if (query == null) {
            return;
        }
        if (query.isEmpty()) {
            throw ApiException.validation(field, "Search query must not be empty.");
        }
        if (query.length() > MAX_QUERY_LENGTH) {
            throw ApiException.validation(
                    field, "Search query must be at most " + MAX_QUERY_LENGTH + " characters.");
        }
    }

    /** 16.8 — reject a birth-year range whose lower bound exceeds its upper bound. */
    private void validateBirthYearRange(SearchFilters filters) {
        if (filters == null) {
            return;
        }
        Integer min = filters.birthYearMin();
        Integer max = filters.birthYearMax();
        if (min != null && max != null && min > max) {
            throw ApiException.validation(
                    "birthYearRange",
                    "The birth-year range lower bound must not exceed its upper bound.");
        }
    }

    /**
     * 16.8-style validation of enum-valued filters — an invalid value is rejected with
     * {@code VALIDATION_ERROR} naming the offending field.
     */
    private void validateFilterValues(SearchFilters filters) {
        if (filters == null) {
            return;
        }
        validateEnum("gender", filters.gender(), GENDERS, true);
        validateEnum("side", filters.side(), SIDES, false);
        validateEnum("claimedStatus", filters.claimedStatus(), CLAIMED_STATUSES, false);
        validateEnum("relationshipType", filters.relationshipType(), RELATIONSHIP_TYPES, false);
    }

    /**
     * Reject a non-null filter {@code value} that is not in the allowed set, naming {@code field}.
     *
     * @param caseInsensitive whether the value is matched case-insensitively (gender accepts e.g.
     *                        {@code MALE}); other filters require the exact lowercase token
     */
    private void validateEnum(
            String field, String value, Set<String> allowed, boolean caseInsensitive) {
        if (value == null) {
            return;
        }
        String candidate = caseInsensitive ? value.trim().toLowerCase() : value;
        if (!allowed.contains(candidate)) {
            throw ApiException.validation(
                    field, "Unsupported value for filter '" + field + "': " + value);
        }
    }

    /** Whether a paternal/maternal side filter has been supplied. */
    private boolean hasSideFilter(SearchFilters filters) {
        return filters != null && filters.side() != null;
    }
}
