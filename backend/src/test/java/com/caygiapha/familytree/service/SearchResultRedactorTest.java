package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link SearchResultRedactor} — name redaction of search results for the current
 * viewer (Requirements 20.2, 21.4), including name-enumeration protection.
 */
class SearchResultRedactorTest {

    private static final Clock FIXED =
            Clock.fixed(Instant.parse("2026-06-15T00:00:00Z"), ZoneOffset.UTC);

    private final UUID treeId = UUID.randomUUID();
    private PersonRepository personRepository;
    private TreeRepository treeRepository;
    private AuthorizationService authorizationService;
    private SearchResultRedactor redactor;

    @BeforeEach
    void setUp() {
        personRepository = mock(PersonRepository.class);
        treeRepository = mock(TreeRepository.class);
        authorizationService = mock(AuthorizationService.class);
        redactor = new SearchResultRedactor(
                personRepository, treeRepository, authorizationService, new LivingPersonPolicy(FIXED));
        Tree tree = new Tree(UUID.randomUUID()); // living_redaction defaults to true
        lenient().when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));
    }

    private UUID stubPerson(String name, Integer birthYear, boolean deceased, String visName) {
        UUID id = UUID.randomUUID();
        Person p = new Person(treeId, name, "male");
        p.setBirthYear(birthYear);
        p.setDeathStatus(deceased);
        p.setVisName(visName);
        when(personRepository.findByIdAndTreeId(id, treeId)).thenReturn(Optional.of(p));
        return id;
    }

    @Test
    void ownerSeesAllRealNames() {
        UUID living = stubPerson("Sống", 2000, false, PersonVisibility.PUBLIC);
        when(authorizationService.classify(any(), any())).thenReturn(Role.OWNER);

        SearchResponse out = redactor.redact(
                treeId, SearchResponse.of(List.of(new SearchResult(living, "Sống"))), false);

        assertThat(out.results()).singleElement()
                .extracting(SearchResult::displayName).isEqualTo("Sống");
    }

    @Test
    void nonPrivilegedViewerGetsPlaceholderForLivingViaFilterSearch() {
        UUID living = stubPerson("Sống", 2000, false, PersonVisibility.PUBLIC);
        when(authorizationService.classify(any(), any())).thenReturn(Role.NEITHER);

        // Filter/address search (no name query) — person retained with placeholder.
        SearchResponse out = redactor.redact(
                treeId, SearchResponse.of(List.of(new SearchResult(living, "Sống"))), false);

        assertThat(out.results()).singleElement()
                .extracting(SearchResult::displayName)
                .isEqualTo(PersonResponse.REDACTED_NAME_PLACEHOLDER);
    }

    @Test
    void nonPrivilegedNameSearchDropsHiddenNamePersons() {
        UUID living = stubPerson("Sống", 2000, false, PersonVisibility.PUBLIC);
        UUID deceasedPrivateName = stubPerson("Bí Mật", 1900, true, PersonVisibility.PRIVATE);
        UUID deceasedPublicName = stubPerson("Công Khai", 1900, true, PersonVisibility.PUBLIC);
        when(authorizationService.classify(any(), any())).thenReturn(Role.NEITHER);

        SearchResponse out = redactor.redact(treeId, SearchResponse.of(List.of(
                new SearchResult(living, "Sống"),
                new SearchResult(deceasedPrivateName, "Bí Mật"),
                new SearchResult(deceasedPublicName, "Công Khai"))), true);

        // Living and private-name persons are dropped from a name search; only the deceased
        // public-name person remains, with its real name.
        assertThat(out.results()).singleElement()
                .satisfies(r -> {
                    assertThat(r.personId()).isEqualTo(deceasedPublicName);
                    assertThat(r.displayName()).isEqualTo("Công Khai");
                });
    }

    @Test
    void deceasedPublicNameIsVisibleToNonPrivilegedViewer() {
        UUID deceased = stubPerson("Tổ Tiên", 1850, true, PersonVisibility.PUBLIC);
        when(authorizationService.classify(any(), any())).thenReturn(Role.NEITHER);

        SearchResponse out = redactor.redact(
                treeId, SearchResponse.of(List.of(new SearchResult(deceased, "Tổ Tiên"))), false);

        assertThat(out.results()).singleElement()
                .extracting(SearchResult::displayName).isEqualTo("Tổ Tiên");
    }
}
