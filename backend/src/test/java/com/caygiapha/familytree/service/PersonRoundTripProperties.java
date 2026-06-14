package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.CreatePersonRequest;
import com.caygiapha.familytree.dto.EditPersonRequest;
import com.caygiapha.familytree.dto.PersonResponse;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.repository.PersonRepository;
import java.time.Year;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.From;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based tests for the Graph_Store person create/edit/read round-trip.
 *
 * <p>Feature: vietnamese-family-tree, Property 5
 *
 * <p><b>Property 5: Person create/edit round-trip and partial update</b> — for any valid person and
 * any subset of fields to edit, reading the person after create or edit returns exactly the stored
 * values, with edited fields updated and all unspecified fields unchanged.
 *
 * <p><b>Validates: Requirements 3.1, 3.3</b>
 *
 * <p>Persistence is replaced with a deterministic in-memory fake {@link PersonRepository} backed by
 * a {@link Map}, so create→read and edit→read round-trips are asserted without a real database. The
 * fake assigns an id on first save (mirroring JPA id generation) and serves tree-scoped reads.
 */
class PersonRoundTripProperties {

    private static final int CURRENT_YEAR = Year.now().getValue();

    /**
     * Property 5: a create followed by a read returns exactly the created values, and a subsequent
     * partial edit followed by a read returns the edited fields updated with every unspecified field
     * left unchanged.
     */
    @Property(tries = 200)
    void createEditRoundTripPreservesAndUpdatesFields(
            @ForAll("displayNames") String createName,
            @ForAll("genders") String createGender,
            @ForAll("optionalBirthOrders") Integer createBirthOrder,
            @ForAll("optionalBirthYears") Integer createBirthYear,
            @ForAll("optionalBooleans") Boolean createDeath,
            @ForAll @From("editRequests") EditPersonRequest edit) {

        UUID treeId = UUID.randomUUID();
        PersonService service = new PersonService(inMemoryRepository());

        // ----- create → read: read returns exactly the stored (created) values (Req 3.1) -----
        UUID id = service.create(
                new CreatePersonRequest(
                        treeId, createName, createGender, createBirthOrder, createBirthYear, createDeath));

        boolean expectedDeath = Boolean.TRUE.equals(createDeath); // create defaults null → false
        PersonResponse afterCreate = PersonResponse.forPrivilegedViewer(service.read(treeId, id));

        assertThat(afterCreate.id()).isEqualTo(id);
        assertThat(afterCreate.treeId()).isEqualTo(treeId);
        assertThat(afterCreate.displayName()).isEqualTo(createName);
        assertThat(afterCreate.gender()).isEqualTo(createGender);
        assertThat(afterCreate.birthOrder()).isEqualTo(createBirthOrder);
        assertThat(afterCreate.birthYear()).isEqualTo(createBirthYear);
        assertThat(afterCreate.deathStatus()).isEqualTo(expectedDeath);

        // ----- edit → read: specified fields updated, unspecified fields unchanged (Req 3.3) -----
        service.edit(treeId, id, edit);
        PersonResponse afterEdit = PersonResponse.forPrivilegedViewer(service.read(treeId, id));

        // A null field in the edit request means "not specified" → keep the prior value.
        String expectedName = edit.displayName() != null ? edit.displayName() : createName;
        String expectedGender = edit.gender() != null ? edit.gender() : createGender;
        Integer expectedBirthOrder =
                edit.birthOrder() != null ? edit.birthOrder() : createBirthOrder;
        Integer expectedBirthYear = edit.birthYear() != null ? edit.birthYear() : createBirthYear;
        boolean expectedDeathAfterEdit =
                edit.deathStatus() != null ? edit.deathStatus() : expectedDeath;

        assertThat(afterEdit.id()).isEqualTo(id);
        assertThat(afterEdit.treeId()).isEqualTo(treeId);
        assertThat(afterEdit.displayName()).isEqualTo(expectedName);
        assertThat(afterEdit.gender()).isEqualTo(expectedGender);
        assertThat(afterEdit.birthOrder()).isEqualTo(expectedBirthOrder);
        assertThat(afterEdit.birthYear()).isEqualTo(expectedBirthYear);
        assertThat(afterEdit.deathStatus()).isEqualTo(expectedDeathAfterEdit);
    }

    // --------------------------------------------------------------------------------------------
    // Generators — constrained to the valid input space (criterion 3.2 bounds).
    // --------------------------------------------------------------------------------------------

    /** Valid display names: 1–100 characters. */
    @Provide
    Arbitrary<String> displayNames() {
        return Arbitraries.strings().ofMinLength(1).ofMaxLength(100);
    }

    @Provide
    Arbitrary<String> genders() {
        return Arbitraries.of("male", "female");
    }

    /** Optional birth order: 1–99, or absent (null). */
    @Provide
    Arbitrary<Integer> optionalBirthOrders() {
        return Arbitraries.integers().between(1, 99).injectNull(0.3);
    }

    /** Optional birth year: 1000–current year, or absent (null). */
    @Provide
    Arbitrary<Integer> optionalBirthYears() {
        return Arbitraries.integers().between(1000, CURRENT_YEAR).injectNull(0.3);
    }

    /** Optional boolean (death status): true/false, or absent (null = "not specified"). */
    @Provide
    Arbitrary<Boolean> optionalBooleans() {
        return Arbitraries.of(Boolean.TRUE, Boolean.FALSE).injectNull(0.3);
    }

    /**
     * Edit requests over an arbitrary subset of fields: each field is independently either a valid
     * value or {@code null} ("not specified"), including the empty edit (all null).
     */
    @Provide
    Arbitrary<EditPersonRequest> editRequests() {
        Arbitrary<String> names =
                Arbitraries.strings().ofMinLength(1).ofMaxLength(100).injectNull(0.4);
        Arbitrary<String> genders = Arbitraries.of("male", "female").injectNull(0.4);
        Arbitrary<Integer> orders = Arbitraries.integers().between(1, 99).injectNull(0.4);
        Arbitrary<Integer> years = Arbitraries.integers().between(1000, CURRENT_YEAR).injectNull(0.4);
        Arbitrary<Boolean> deaths = Arbitraries.of(Boolean.TRUE, Boolean.FALSE).injectNull(0.4);
        return Combinators.combine(names, genders, orders, years, deaths)
                .as(EditPersonRequest::new);
    }

    // --------------------------------------------------------------------------------------------
    // In-memory fake repository (Map-backed) so round-trip persistence can be asserted.
    // --------------------------------------------------------------------------------------------

    private static PersonRepository inMemoryRepository() {
        Map<UUID, Person> store = new HashMap<>();
        PersonRepository repository = mock(PersonRepository.class);

        when(repository.save(any(Person.class)))
                .thenAnswer(invocation -> {
                    Person person = invocation.getArgument(0);
                    if (person.getId() == null) {
                        setId(person, UUID.randomUUID());
                    }
                    store.put(person.getId(), person);
                    return person;
                });

        when(repository.findByIdAndTreeId(any(UUID.class), any(UUID.class)))
                .thenAnswer(invocation -> {
                    UUID id = invocation.getArgument(0);
                    UUID treeId = invocation.getArgument(1);
                    Person person = store.get(id);
                    return (person != null && treeId.equals(person.getTreeId()))
                            ? Optional.of(person)
                            : Optional.empty();
                });

        return repository;
    }

    /** Assign the JPA-managed id via reflection, mirroring database id generation. */
    private static void setId(Person person, UUID id) {
        try {
            var field = Person.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(person, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
