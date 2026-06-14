package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.CreatePersonRequest;
import com.caygiapha.familytree.dto.EditPersonRequest;
import com.caygiapha.familytree.dto.PersonVisibility;
import com.caygiapha.familytree.dto.VisibilityUpdateRequest;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.PersonRepository;
import java.time.Year;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.InvocationOnMock;

/**
 * Unit tests for {@link PersonService} (Graph_Store create/edit/read) covering field-bounds
 * validation (3.2, 3.6), partial-update semantics (3.3), the created-id return (3.1), and the
 * not-accessible rejection for nonexistent targets (3.7).
 */
class PersonServiceTest {

    private PersonRepository repository;
    private PersonService service;
    private final UUID treeId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        repository = org.mockito.Mockito.mock(PersonRepository.class);
        service = new PersonService(repository);
        // save() returns its argument so the service can read back the persisted state.
        when(repository.save(any(Person.class)))
                .thenAnswer((InvocationOnMock i) -> i.getArgument(0));
    }

    private CreatePersonRequest validCreate() {
        return new CreatePersonRequest(treeId, "Nguyen Van A", "male", 2, 1990, false);
    }

    @Test
    void createReturnsGeneratedId() {
        UUID generated = UUID.randomUUID();
        when(repository.save(any(Person.class))).thenAnswer((InvocationOnMock i) -> {
            Person p = i.getArgument(0);
            // Simulate the DB assigning an id.
            setId(p, generated);
            return p;
        });

        UUID id = service.create(validCreate());

        assertThat(id).isEqualTo(generated);
        verify(repository).save(any(Person.class));
    }

    @Test
    void createPersistsAllProvidedFields() {
        service.create(new CreatePersonRequest(treeId, "An", "female", 1, 1000, true));

        var captor = org.mockito.ArgumentCaptor.forClass(Person.class);
        verify(repository).save(captor.capture());
        Person saved = captor.getValue();
        assertThat(saved.getDisplayName()).isEqualTo("An");
        assertThat(saved.getGender()).isEqualTo("female");
        assertThat(saved.getBirthOrder()).isEqualTo(1);
        assertThat(saved.getBirthYear()).isEqualTo(1000);
        assertThat(saved.isDeathStatus()).isTrue();
    }

    @Test
    void createDefaultsDeathStatusToFalseWhenOmitted() {
        service.create(new CreatePersonRequest(treeId, "An", "male", null, null, null));

        var captor = org.mockito.ArgumentCaptor.forClass(Person.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().isDeathStatus()).isFalse();
        assertThat(captor.getValue().getBirthOrder()).isNull();
        assertThat(captor.getValue().getBirthYear()).isNull();
    }

    @Test
    void createRejectsEmptyDisplayName() {
        assertValidationField("displayName",
                () -> service.create(new CreatePersonRequest(treeId, "", "male", null, null, null)));
        verify(repository, never()).save(any());
    }

    @Test
    void createRejectsDisplayNameOver100Chars() {
        String name = "x".repeat(101);
        assertValidationField("displayName",
                () -> service.create(new CreatePersonRequest(treeId, name, "male", null, null, null)));
    }

    @Test
    void createAcceptsBoundaryDisplayNameLengths() {
        service.create(new CreatePersonRequest(treeId, "x", "male", null, null, null));
        service.create(new CreatePersonRequest(treeId, "x".repeat(100), "male", null, null, null));
        // no exception expected
    }

    @Test
    void createRejectsInvalidGender() {
        assertValidationField("gender",
                () -> service.create(new CreatePersonRequest(treeId, "An", "other", null, null, null)));
        assertValidationField("gender",
                () -> service.create(new CreatePersonRequest(treeId, "An", null, null, null, null)));
    }

    @Test
    void createRejectsBirthOrderOutOfRange() {
        assertValidationField("birthOrder",
                () -> service.create(new CreatePersonRequest(treeId, "An", "male", 0, null, null)));
        assertValidationField("birthOrder",
                () -> service.create(new CreatePersonRequest(treeId, "An", "male", 100, null, null)));
    }

    @Test
    void createRejectsBirthYearOutOfRange() {
        int nextYear = Year.now().getValue() + 1;
        assertValidationField("birthYear",
                () -> service.create(new CreatePersonRequest(treeId, "An", "male", null, 999, null)));
        assertValidationField("birthYear",
                () -> service.create(new CreatePersonRequest(treeId, "An", "male", null, nextYear, null)));
    }

    @Test
    void createRejectsMissingTreeId() {
        assertValidationField("treeId",
                () -> service.create(new CreatePersonRequest(null, "An", "male", null, null, null)));
    }

    @Test
    void editUpdatesOnlySpecifiedFields() {
        Person existing = new Person(treeId, "Old Name", "male");
        existing.setBirthOrder(3);
        existing.setBirthYear(1980);
        existing.setDeathStatus(false);
        UUID id = UUID.randomUUID();
        setId(existing, id);
        when(repository.findByIdAndTreeId(id, treeId)).thenReturn(Optional.of(existing));

        Person result = service.edit(treeId, id,
                new EditPersonRequest("New Name", null, null, null, null));

        assertThat(result.getDisplayName()).isEqualTo("New Name");
        // unspecified fields unchanged
        assertThat(result.getGender()).isEqualTo("male");
        assertThat(result.getBirthOrder()).isEqualTo(3);
        assertThat(result.getBirthYear()).isEqualTo(1980);
        assertThat(result.isDeathStatus()).isFalse();
    }

    @Test
    void editValidatesSuppliedFieldsAndLeavesNodeUnchangedOnRejection() {
        Person existing = new Person(treeId, "Old Name", "male");
        existing.setBirthOrder(3);
        UUID id = UUID.randomUUID();
        setId(existing, id);
        when(repository.findByIdAndTreeId(id, treeId)).thenReturn(Optional.of(existing));

        assertValidationField("birthOrder", () -> service.edit(treeId, id,
                new EditPersonRequest("New Name", null, 0, null, null)));

        // No save performed; the in-memory entity name is not mutated before validation passes.
        verify(repository, never()).save(any());
        assertThat(existing.getDisplayName()).isEqualTo("Old Name");
        assertThat(existing.getBirthOrder()).isEqualTo(3);
    }

    @Test
    void editRejectsNonexistentTarget() {
        UUID id = UUID.randomUUID();
        when(repository.findByIdAndTreeId(id, treeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.edit(treeId, id,
                new EditPersonRequest("New Name", null, null, null, null)))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NODE_NOT_ACCESSIBLE));
        verify(repository, never()).save(any());
    }

    @Test
    void readRejectsNonexistentTarget() {
        UUID id = UUID.randomUUID();
        when(repository.findByIdAndTreeId(id, treeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.read(treeId, id))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NODE_NOT_ACCESSIBLE));
    }

    @Test
    void readReturnsStoredPerson() {
        Person existing = new Person(treeId, "An", "female");
        UUID id = UUID.randomUUID();
        setId(existing, id);
        when(repository.findByIdAndTreeId(id, treeId)).thenReturn(Optional.of(existing));

        assertThat(service.read(treeId, id)).isSameAs(existing);
    }

    // ----- Per-field visibility setter (Requirements 14.1, 14.2) -----

    @Test
    void setVisibilityUpdatesOnlySpecifiedSettings() {
        Person existing = new Person(treeId, "An", "male"); // all vis_* default to "private"
        UUID id = UUID.randomUUID();
        setId(existing, id);
        when(repository.findByIdAndTreeId(id, treeId)).thenReturn(Optional.of(existing));

        Person result = service.setVisibility(treeId, id,
                new VisibilityUpdateRequest(PersonVisibility.PUBLIC, null, null, null, null, null));

        assertThat(result.getVisMarital()).isEqualTo(PersonVisibility.PUBLIC);
        // unspecified settings keep their stored (default private) value (14.2)
        assertThat(result.getVisAdoption()).isEqualTo(PersonVisibility.PRIVATE);
        assertThat(result.getVisDeath()).isEqualTo(PersonVisibility.PRIVATE);
    }

    @Test
    void setVisibilityRejectsInvalidValueAndLeavesNodeUnchanged() {
        Person existing = new Person(treeId, "An", "male");
        UUID id = UUID.randomUUID();
        setId(existing, id);
        when(repository.findByIdAndTreeId(id, treeId)).thenReturn(Optional.of(existing));

        assertValidationField("visDeath", () -> service.setVisibility(treeId, id,
                new VisibilityUpdateRequest(null, null, "hidden", null, null, null)));

        verify(repository, never()).save(any());
        assertThat(existing.getVisDeath()).isEqualTo(PersonVisibility.PRIVATE);
    }

    @Test
    void setVisibilityRejectsNonexistentTarget() {
        UUID id = UUID.randomUUID();
        when(repository.findByIdAndTreeId(id, treeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setVisibility(treeId, id,
                new VisibilityUpdateRequest(PersonVisibility.PUBLIC, null, null, null, null, null)))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NODE_NOT_ACCESSIBLE));
        verify(repository, never()).save(any());
    }

    private void assertValidationField(String field, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo(field);
                });
    }

    /** Set the JPA-managed id via reflection for test fixtures. */
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
