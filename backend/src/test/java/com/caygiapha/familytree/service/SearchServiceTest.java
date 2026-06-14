package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.SearchFilters;
import com.caygiapha.familytree.dto.SearchRequest;
import com.caygiapha.familytree.dto.SearchResponse;
import com.caygiapha.familytree.dto.SearchResponse.SearchResult;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link SearchService} — name and address search with validation (Requirements
 * 16.1, 16.2, 16.6, 16.8).
 *
 * <p>{@link PersonRepository} and {@link KinshipAddressService} are mocked: name search exercises
 * the real {@link NameNormalizer}, and address search drives the resolver via stubbed
 * {@link AddressResolution} results so the exact-match semantics are verified in isolation.
 */
class SearchServiceTest {

    private static final UUID TREE_ID = UUID.randomUUID();
    private static final UUID VIEWPOINT = UUID.randomUUID();

    private final PersonRepository personRepository = mock(PersonRepository.class);
    private final KinshipAddressService kinshipAddressService = mock(KinshipAddressService.class);
    private final ClaimService claimService = mock(ClaimService.class);
    private final RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
    private final SearchService service = new SearchService(
            personRepository, kinshipAddressService, claimService, relationshipRepository);

    private final List<Person> persons = new ArrayList<>();
    private final UUID nguyen = person("Nguyễn Văn Đức");
    private final UUID tran = person("Trần Thị Hoà");
    private final UUID le = person("Lê Văn Ước");

    // --- Name search (16.1) -------------------------------------------------------------------

    @Test
    void nameSearchIsCaseFoldedAndDiacriticInsensitiveSubstring() {
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(persons);

        // "van" (no diacritics, lowercase) matches both "Nguyễn Văn Đức" and "Lê Văn Ước".
        SearchResponse response = service.search(TREE_ID, nameRequest("van"));

        assertThat(response.noMatches()).isFalse();
        assertThat(response.results().stream().map(SearchResult::personId))
                .containsExactlyInAnyOrder(nguyen, le)
                .doesNotContain(tran);
    }

    @Test
    void nameSearchMatchesAcrossDiacriticVariantOfQuery() {
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(persons);

        // A query carrying diacritics matches its diacritic-stripped counterpart in the name.
        SearchResponse response = service.search(TREE_ID, nameRequest("ĐỨC"));

        assertThat(response.results().stream().map(SearchResult::personId))
                .containsExactly(nguyen);
    }

    @Test
    void nameSearchWithNoMatchReturnsEmptyResultAndNoMatchIndication() {
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(persons);

        SearchResponse response = service.search(TREE_ID, nameRequest("Phạm"));

        // 16.6 — empty result set carries the no-matches indication.
        assertThat(response.results()).isEmpty();
        assertThat(response.noMatches()).isTrue();
    }

    // --- Address search (16.2) ----------------------------------------------------------------

    @Test
    void addressSearchReturnsAllAndOnlyPersonsWhoseAddressEqualsTheQueryExactly() {
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(persons);
        when(personRepository.existsByIdAndTreeId(VIEWPOINT, TREE_ID)).thenReturn(true);

        // From the viewpoint: nguyen -> "bác", tran -> "bác", le -> "chú".
        when(kinshipAddressService.resolveAddress(TREE_ID, VIEWPOINT, nguyen))
                .thenReturn(AddressResolution.asserted("bác"));
        when(kinshipAddressService.resolveAddress(TREE_ID, VIEWPOINT, tran))
                .thenReturn(AddressResolution.asserted("bác"));
        when(kinshipAddressService.resolveAddress(TREE_ID, VIEWPOINT, le))
                .thenReturn(AddressResolution.asserted("chú"));

        SearchResponse response = service.search(TREE_ID, addressRequest("bác", VIEWPOINT));

        assertThat(response.results().stream().map(SearchResult::personId))
                .containsExactlyInAnyOrder(nguyen, tran)
                .doesNotContain(le);
    }

    @Test
    void addressSearchExcludesUnresolvedTargets() {
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(persons);
        when(personRepository.existsByIdAndTreeId(VIEWPOINT, TREE_ID)).thenReturn(true);

        when(kinshipAddressService.resolveAddress(TREE_ID, VIEWPOINT, nguyen))
                .thenReturn(AddressResolution.asserted("cháu"));
        // An unresolved target carries no form of address and never matches.
        when(kinshipAddressService.resolveAddress(TREE_ID, VIEWPOINT, tran))
                .thenReturn(AddressResolution.unresolved(CanonicalResolution.noPath()));
        when(kinshipAddressService.resolveAddress(TREE_ID, VIEWPOINT, le))
                .thenReturn(AddressResolution.unresolved(CanonicalResolution.noPath()));

        SearchResponse response = service.search(TREE_ID, addressRequest("cháu", VIEWPOINT));

        assertThat(response.results().stream().map(SearchResult::personId))
                .containsExactly(nguyen);
    }

    @Test
    void addressSearchRejectsNonexistentViewpoint() {
        when(personRepository.existsByIdAndTreeId(VIEWPOINT, TREE_ID)).thenReturn(false);

        assertThatThrownBy(() -> service.search(TREE_ID, addressRequest("bác", VIEWPOINT)))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NODE_NOT_ACCESSIBLE));
    }

    @Test
    void addressSearchRequiresAViewpoint() {
        assertThatThrownBy(() -> service.search(TREE_ID, addressRequest("bác", null)))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("viewpointId");
                });
    }

    // --- Validation (16.8) --------------------------------------------------------------------

    @Test
    void rejectsEmptyQuery() {
        assertThatThrownBy(() -> service.search(TREE_ID, nameRequest("")))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("nameQuery");
                });
    }

    @Test
    void rejectsOverHundredCharacterQuery() {
        String tooLong = "a".repeat(101);

        assertThatThrownBy(() -> service.search(TREE_ID, nameRequest(tooLong)))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("nameQuery");
                });
    }

    @Test
    void acceptsExactlyHundredCharacterQuery() {
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(persons);
        String boundary = "a".repeat(100);

        // At the 100-character boundary the query is valid; it simply matches nothing here.
        SearchResponse response = service.search(TREE_ID, nameRequest(boundary));

        assertThat(response.noMatches()).isTrue();
    }

    @Test
    void rejectsInvertedBirthYearRange() {
        SearchRequest request = new SearchRequest(
                "van", null, null,
                new SearchFilters(null, null, 2000, 1990, null, null, null));

        assertThatThrownBy(() -> service.search(TREE_ID, request))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("birthYearRange");
                });
    }

    @Test
    void acceptsNonInvertedBirthYearRange() {
        Person inRange = buildPerson("Nguyễn Văn A", "male", 1995, false);
        Person outOfRange = buildPerson("Lê Văn B", "male", 1980, false);
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(List.of(inRange, outOfRange));
        SearchRequest request = new SearchRequest(
                "van", null, null,
                new SearchFilters(null, null, 1990, 2000, null, null, null));

        // A well-ordered range passes validation and is applied: only the in-range person matches.
        SearchResponse response = service.search(TREE_ID, request);

        assertThat(response.results().stream().map(SearchResult::personId))
                .containsExactly(inRange.getId());
    }

    // --- Field filters (16.3, 16.4) -----------------------------------------------------------

    @Test
    void filtersByGender() {
        Person male = buildPerson("Anh", "male", null, false);
        Person female = buildPerson("Chị", "female", null, false);
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(List.of(male, female));

        SearchResponse response =
                service.search(TREE_ID, filterRequest(filters().gender("female").build()));

        assertThat(response.results().stream().map(SearchResult::personId))
                .containsExactly(female.getId());
    }

    @Test
    void filtersByBirthYearRangeInclusiveAndExcludesUnknownYear() {
        Person born1980 = buildPerson("A", "male", 1980, false);
        Person born2000 = buildPerson("B", "male", 2000, false);
        Person bornUnknown = buildPerson("C", "male", null, false);
        when(personRepository.findByTreeId(TREE_ID))
                .thenReturn(List.of(born1980, born2000, bornUnknown));

        // Inclusive [1980, 2000]: both known years match; the unknown-year person does not.
        SearchResponse response = service.search(
                TREE_ID, filterRequest(filters().birthYear(1980, 2000).build()));

        assertThat(response.results().stream().map(SearchResult::personId))
                .containsExactlyInAnyOrder(born1980.getId(), born2000.getId())
                .doesNotContain(bornUnknown.getId());
    }

    @Test
    void filtersByDeathStatus() {
        Person living = buildPerson("Living", "male", null, false);
        Person deceased = buildPerson("Deceased", "male", null, true);
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(List.of(living, deceased));

        SearchResponse response =
                service.search(TREE_ID, filterRequest(filters().deathStatus(true).build()));

        assertThat(response.results().stream().map(SearchResult::personId))
                .containsExactly(deceased.getId());
    }

    @Test
    void filtersByClaimedStatus() {
        Person claimed = buildPerson("Claimed", "male", null, false);
        Person unclaimed = buildPerson("Unclaimed", "male", null, false);
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(List.of(claimed, unclaimed));
        when(claimService.isClaimed(claimed.getId())).thenReturn(true);
        when(claimService.isClaimed(unclaimed.getId())).thenReturn(false);

        assertThat(service
                        .search(TREE_ID, filterRequest(filters().claimedStatus("claimed").build()))
                        .results()
                        .stream()
                        .map(SearchResult::personId))
                .containsExactly(claimed.getId());
        assertThat(service
                        .search(TREE_ID, filterRequest(filters().claimedStatus("unclaimed").build()))
                        .results()
                        .stream()
                        .map(SearchResult::personId))
                .containsExactly(unclaimed.getId());
    }

    @Test
    void filtersByRelationshipTypeParticipation() {
        Person spouse = buildPerson("Spouse", "male", null, false);
        Person friendOnly = buildPerson("Friend", "male", null, false);
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(List.of(spouse, friendOnly));
        when(relationshipRepository.findBySourceIdOrTargetId(spouse.getId(), spouse.getId()))
                .thenReturn(List.of(edge("marriage", spouse.getId(), friendOnly.getId())));
        when(relationshipRepository.findBySourceIdOrTargetId(friendOnly.getId(), friendOnly.getId()))
                .thenReturn(List.of(edge("non_bloodline", spouse.getId(), friendOnly.getId())));

        SearchResponse response = service.search(
                TREE_ID, filterRequest(filters().relationshipType("marriage").build()));

        assertThat(response.results().stream().map(SearchResult::personId))
                .containsExactly(spouse.getId());
    }

    @Test
    void filtersBySideRelativeToViewpoint() {
        Person paternal = buildPerson("Paternal", "male", null, false);
        Person maternal = buildPerson("Maternal", "male", null, false);
        Person unresolved = buildPerson("Unresolved", "male", null, false);
        when(personRepository.findByTreeId(TREE_ID))
                .thenReturn(List.of(paternal, maternal, unresolved));
        when(personRepository.existsByIdAndTreeId(VIEWPOINT, TREE_ID)).thenReturn(true);
        when(kinshipAddressService.resolveDerivedAddress(TREE_ID, VIEWPOINT, paternal.getId()))
                .thenReturn(resolvedWithSide("bác", CanonicalRelation.Side.PATERNAL));
        when(kinshipAddressService.resolveDerivedAddress(TREE_ID, VIEWPOINT, maternal.getId()))
                .thenReturn(resolvedWithSide("cậu", CanonicalRelation.Side.MATERNAL));
        when(kinshipAddressService.resolveDerivedAddress(TREE_ID, VIEWPOINT, unresolved.getId()))
                .thenReturn(AddressResolution.unresolved(CanonicalResolution.noPath()));

        SearchRequest request = new SearchRequest(
                null, null, VIEWPOINT, filters().side("paternal").build());
        SearchResponse response = service.search(TREE_ID, request);

        // Only the paternal-side person matches; the maternal and unresolved persons do not.
        assertThat(response.results().stream().map(SearchResult::personId))
                .containsExactly(paternal.getId());
    }

    @Test
    void sideFilterRequiresAViewpoint() {
        SearchRequest request =
                new SearchRequest(null, null, null, filters().side("paternal").build());

        assertThatThrownBy(() -> service.search(TREE_ID, request))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("viewpointId");
                });
    }

    @Test
    void combinedFiltersIntersect() {
        Person match = buildPerson("Match", "female", 1990, false);
        Person wrongGender = buildPerson("WrongGender", "male", 1990, false);
        Person wrongYear = buildPerson("WrongYear", "female", 1970, false);
        when(personRepository.findByTreeId(TREE_ID))
                .thenReturn(List.of(match, wrongGender, wrongYear));

        SearchResponse response = service.search(
                TREE_ID,
                filterRequest(filters().gender("female").birthYear(1985, 1995).build()));

        // Only the person satisfying BOTH the gender and the birth-year filter is returned.
        assertThat(response.results().stream().map(SearchResult::personId))
                .containsExactly(match.getId());
    }

    @Test
    void removingAFilterGrowsOrKeepsTheResultSet() {
        Person femaleInRange = buildPerson("F1990", "female", 1990, false);
        Person maleInRange = buildPerson("M1990", "male", 1990, false);
        when(personRepository.findByTreeId(TREE_ID))
                .thenReturn(List.of(femaleInRange, maleInRange));

        // Two filters (gender + year) yield a strict subset of the single-filter (year) result.
        List<UUID> combined = service
                .search(TREE_ID,
                        filterRequest(filters().gender("female").birthYear(1985, 1995).build()))
                .results().stream().map(SearchResult::personId).toList();
        List<UUID> yearOnly = service
                .search(TREE_ID, filterRequest(filters().birthYear(1985, 1995).build()))
                .results().stream().map(SearchResult::personId).toList();

        assertThat(combined).containsExactly(femaleInRange.getId());
        assertThat(yearOnly).containsExactlyInAnyOrder(femaleInRange.getId(), maleInRange.getId());
        assertThat(yearOnly).containsAll(combined);
    }

    // --- Filter-value validation (16.8 style) -------------------------------------------------

    @Test
    void rejectsInvalidGenderFilter() {
        assertFilterValidationError("gender", filters().gender("other").build());
    }

    @Test
    void rejectsInvalidSideFilter() {
        assertFilterValidationError("side", filters().side("northern").build());
    }

    @Test
    void rejectsInvalidClaimedStatusFilter() {
        assertFilterValidationError("claimedStatus", filters().claimedStatus("maybe").build());
    }

    @Test
    void rejectsInvalidRelationshipTypeFilter() {
        assertFilterValidationError("relationshipType", filters().relationshipType("cousin").build());
    }

    private void assertFilterValidationError(String field, SearchFilters filters) {
        assertThatThrownBy(() -> service.search(TREE_ID, filterRequest(filters)))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo(field);
                });
    }

    // --- Fixture helpers ----------------------------------------------------------------------

    private SearchRequest nameRequest(String nameQuery) {
        return new SearchRequest(nameQuery, null, null, null);
    }

    private SearchRequest addressRequest(String addressQuery, UUID viewpointId) {
        return new SearchRequest(null, addressQuery, viewpointId, null);
    }

    private SearchRequest filterRequest(SearchFilters filters) {
        return new SearchRequest(null, null, null, filters);
    }

    /** A small fluent builder for {@link SearchFilters} so each test names only the fields it sets. */
    private static FiltersBuilder filters() {
        return new FiltersBuilder();
    }

    private static final class FiltersBuilder {
        private String gender;
        private String side;
        private Integer birthYearMin;
        private Integer birthYearMax;
        private Boolean deathStatus;
        private String claimedStatus;
        private String relationshipType;

        FiltersBuilder gender(String value) {
            this.gender = value;
            return this;
        }

        FiltersBuilder side(String value) {
            this.side = value;
            return this;
        }

        FiltersBuilder birthYear(Integer min, Integer max) {
            this.birthYearMin = min;
            this.birthYearMax = max;
            return this;
        }

        FiltersBuilder deathStatus(Boolean value) {
            this.deathStatus = value;
            return this;
        }

        FiltersBuilder claimedStatus(String value) {
            this.claimedStatus = value;
            return this;
        }

        FiltersBuilder relationshipType(String value) {
            this.relationshipType = value;
            return this;
        }

        SearchFilters build() {
            return new SearchFilters(
                    gender, side, birthYearMin, birthYearMax,
                    deathStatus, claimedStatus, relationshipType);
        }
    }

    /** Build a detached person with the given fields and a generated id (not added to {@code persons}). */
    private Person buildPerson(String name, String gender, Integer birthYear, boolean death) {
        Person p = new Person(TREE_ID, name, gender);
        setId(p, UUID.randomUUID());
        p.setBirthYear(birthYear);
        p.setDeathStatus(death);
        return p;
    }

    /** A typed edge fixture between two nodes. */
    private Relationship edge(String type, UUID sourceId, UUID targetId) {
        return new Relationship(TREE_ID, type, sourceId, targetId);
    }

    /** A resolved derived address carrying a canonical relation on the given side. */
    private static AddressResolution resolvedWithSide(String term, CanonicalRelation.Side side) {
        CanonicalRelation relation = new CanonicalRelation(
                2, 1, side, CanonicalRelation.Gender.MALE,
                CanonicalRelation.BranchOrder.ELDER, false);
        return AddressResolution.resolved(term, CanonicalResolution.resolved(relation));
    }

    private UUID person(String displayName) {
        UUID id = UUID.randomUUID();
        Person p = new Person(TREE_ID, displayName, "male");
        setId(p, id);
        persons.add(p);
        return id;
    }

    /** Persons are persisted with a generated id; for unit tests we set it reflectively. */
    private static void setId(Person person, UUID id) {
        try {
            Field field = Person.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(person, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Unable to set Person id for test fixture", e);
        }
    }
}
