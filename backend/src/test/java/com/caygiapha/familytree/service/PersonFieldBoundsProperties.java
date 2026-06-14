package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.CreatePersonRequest;
import com.caygiapha.familytree.dto.EditPersonRequest;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.PersonRepository;
import java.time.Year;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.mockito.invocation.InvocationOnMock;

/**
 * Property-based test for design <b>Property 4: Person field-bounds validation</b>.
 *
 * <p>Feature: vietnamese-family-tree, Property 4
 *
 * <p>A create/edit request is accepted <em>if and only if</em> every field bound holds: display
 * name 1-100 chars, gender in {male, female}, optional birth order in 1-99, and optional birth year
 * in 1000-current year. A rejected request leaves the target node unchanged (create: nothing is
 * persisted; edit: the stored entity is untouched) and the resulting {@link ApiException} is a
 * {@link ErrorCode#VALIDATION_ERROR} naming the offending field.
 *
 * <p>Validates: Requirements 3.2, 3.6.
 *
 * <p>The repository is mocked (Mockito) so this is a pure domain property test with no database.
 */
class PersonFieldBoundsProperties {

    private static final Set<String> VALID_GENDERS = Set.of("male", "female");
    private static final int CURRENT_YEAR = Year.now().getValue();

    /** A generated bundle of person field values spanning valid and invalid ranges. */
    record Fields(String displayName, String gender, Integer birthOrder, Integer birthYear) {
    }

    @Provide
    Arbitrary<Fields> personFields() {
        // Display names spanning empty (invalid), in-range (valid), and over-100 (invalid),
        // with a small chance of null (invalid for create, "unspecified" for edit).
        Arbitrary<String> displayNames = Arbitraries.oneOf(
                        Arbitraries.just(""),
                        Arbitraries.strings().withCharRange('a', 'z').ofMinLength(1).ofMaxLength(100),
                        Arbitraries.strings().withCharRange('a', 'z').ofMinLength(101).ofMaxLength(105))
                .injectNull(0.1);

        // A mix of valid and invalid gender tokens (plus an occasional null).
        Arbitrary<String> genders = Arbitraries.of("male", "female", "other", "MALE", "", "unknown")
                .injectNull(0.1);

        // Birth order: below-range (incl. 0 and negatives), in-range, above-range, or absent (null).
        Arbitrary<Integer> birthOrders = Arbitraries.oneOf(
                        Arbitraries.integers().between(-5, 0),
                        Arbitraries.integers().between(1, 99),
                        Arbitraries.integers().between(100, 110))
                .injectNull(0.25);

        // Birth year: below-range, in-range, above-range, or absent (null).
        Arbitrary<Integer> birthYears = Arbitraries.oneOf(
                        Arbitraries.integers().between(995, 999),
                        Arbitraries.integers().between(1000, CURRENT_YEAR),
                        Arbitraries.integers().between(CURRENT_YEAR + 1, CURRENT_YEAR + 5))
                .injectNull(0.25);

        return Combinators.combine(displayNames, genders, birthOrders, birthYears).as(Fields::new);
    }

    // ----- Create: accepted iff all bounds hold; rejection names the field and persists nothing.

    @Property(tries = 300)
    void createAcceptedIffAllFieldBoundsHold(@ForAll("personFields") Fields f,
                                             @ForAll boolean deathStatus) {
        PersonRepository repository = mock(PersonRepository.class);
        UUID generatedId = UUID.randomUUID();
        when(repository.save(any(Person.class))).thenAnswer((InvocationOnMock i) -> {
            Person p = i.getArgument(0);
            setId(p, generatedId);
            return p;
        });
        PersonService service = new PersonService(repository);

        UUID treeId = UUID.randomUUID();
        CreatePersonRequest request = new CreatePersonRequest(
                treeId, f.displayName(), f.gender(), f.birthOrder(), f.birthYear(), deathStatus);

        String expectedInvalidField = firstInvalidFieldForCreate(f);

        if (expectedInvalidField == null) {
            UUID id = service.create(request);
            assertThat(id).isEqualTo(generatedId);
            verify(repository).save(any(Person.class));
        } else {
            assertThatThrownBy(() -> service.create(request))
                    .isInstanceOfSatisfying(ApiException.class, ex -> {
                        assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                        assertThat(ex.field()).isEqualTo(expectedInvalidField);
                    });
            // Rejected create persists nothing (the node is never created).
            verify(repository, never()).save(any());
        }
    }

    // ----- Edit: supplied fields validated against the same bounds; rejection leaves node intact.

    @Property(tries = 300)
    void editAcceptedIffSuppliedFieldBoundsHold(@ForAll("personFields") Fields f,
                                                @ForAll boolean deathStatus) {
        PersonRepository repository = mock(PersonRepository.class);
        when(repository.save(any(Person.class)))
                .thenAnswer((InvocationOnMock i) -> i.getArgument(0));
        PersonService service = new PersonService(repository);

        UUID treeId = UUID.randomUUID();
        UUID personId = UUID.randomUUID();

        // A known, valid stored node to detect any unintended mutation on rejection.
        Person existing = new Person(treeId, "Original Name", "male");
        existing.setBirthOrder(5);
        existing.setBirthYear(1985);
        existing.setDeathStatus(false);
        setId(existing, personId);
        when(repository.findByIdAndTreeId(personId, treeId)).thenReturn(Optional.of(existing));

        EditPersonRequest request = new EditPersonRequest(
                f.displayName(), f.gender(), f.birthOrder(), f.birthYear(), deathStatus);

        String expectedInvalidField = firstInvalidFieldForEdit(f);

        if (expectedInvalidField == null) {
            Person result = service.edit(treeId, personId, request);
            verify(repository).save(any(Person.class));
            // Supplied fields are applied; unspecified (null) fields stay as stored.
            assertThat(result.getDisplayName())
                    .isEqualTo(f.displayName() != null ? f.displayName() : "Original Name");
            assertThat(result.getGender())
                    .isEqualTo(f.gender() != null ? f.gender() : "male");
            assertThat(result.getBirthOrder())
                    .isEqualTo(f.birthOrder() != null ? f.birthOrder() : 5);
            assertThat(result.getBirthYear())
                    .isEqualTo(f.birthYear() != null ? f.birthYear() : 1985);
        } else {
            assertThatThrownBy(() -> service.edit(treeId, personId, request))
                    .isInstanceOfSatisfying(ApiException.class, ex -> {
                        assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                        assertThat(ex.field()).isEqualTo(expectedInvalidField);
                    });
            // Rejected edit persists nothing and leaves the stored node entirely unchanged.
            verify(repository, never()).save(any());
            assertThat(existing.getDisplayName()).isEqualTo("Original Name");
            assertThat(existing.getGender()).isEqualTo("male");
            assertThat(existing.getBirthOrder()).isEqualTo(5);
            assertThat(existing.getBirthYear()).isEqualTo(1985);
            assertThat(existing.isDeathStatus()).isFalse();
        }
    }

    // ----- Expected-validity oracles mirroring the criterion-3.2 bounds and the service's order ---

    /**
     * For create, display name and gender are required; the service validates in the order
     * displayName, gender, birthOrder, birthYear. Returns the first invalid field, or null when all
     * bounds hold.
     */
    private static String firstInvalidFieldForCreate(Fields f) {
        if (!nameInRange(f.displayName())) {
            return "displayName";
        }
        if (!genderValid(f.gender())) {
            return "gender";
        }
        if (!birthOrderValid(f.birthOrder())) {
            return "birthOrder";
        }
        if (!birthYearValid(f.birthYear())) {
            return "birthYear";
        }
        return null;
    }

    /**
     * For (partial) edit, a null field means "unspecified" and is left unchanged; only supplied
     * fields are validated, in the order displayName, gender, birthOrder, birthYear.
     */
    private static String firstInvalidFieldForEdit(Fields f) {
        if (f.displayName() != null && !nameInRange(f.displayName())) {
            return "displayName";
        }
        if (f.gender() != null && !genderValid(f.gender())) {
            return "gender";
        }
        if (f.birthOrder() != null && !birthOrderValid(f.birthOrder())) {
            return "birthOrder";
        }
        if (f.birthYear() != null && !birthYearValid(f.birthYear())) {
            return "birthYear";
        }
        return null;
    }

    private static boolean nameInRange(String name) {
        return name != null && name.length() >= 1 && name.length() <= 100;
    }

    private static boolean genderValid(String gender) {
        return gender != null && VALID_GENDERS.contains(gender);
    }

    private static boolean birthOrderValid(Integer birthOrder) {
        return birthOrder == null || (birthOrder >= 1 && birthOrder <= 99);
    }

    private static boolean birthYearValid(Integer birthYear) {
        return birthYear == null || (birthYear >= 1000 && birthYear <= CURRENT_YEAR);
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
