package com.caygiapha.familytree.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.Person;
import java.time.Year;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.From;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based tests for the server-side sensitive-field privacy filter.
 *
 * <p>Feature: vietnamese-family-tree, Property 20
 *
 * <p><b>Property 20: Sensitive-field privacy filter</b> — for any person with arbitrary per-field
 * visibility settings and any requesting viewer, the response includes each private sensitive field
 * <em>if and only if</em> the viewer is the tree owner or the linked {@code Claimed_Node} user (the
 * "privileged" viewer), while every non-private field is always included. A {@code "public"}
 * sensitive field is included for any authorized viewer regardless of privilege.
 *
 * <p><b>Validates: Requirements 14.3, 14.4, 14.5</b>
 *
 * <p>The implementation under test is the pure projection
 * {@link PersonResponse#filteredFor(Person, boolean)} (design "Privacy enforcement server-side"),
 * so no persistence or mocking is needed: each generated {@link Person} is constructed in memory
 * with random sensitive field values ({@code deathStatus}, {@code adoptionStatus}), random
 * visibility settings ({@code vis_death}, {@code vis_adoption} ∈ {private, public}), random
 * non-sensitive fields, and a random {@code privileged} flag standing for owner/linked vs neither.
 * An independent oracle decides exposure: a sensitive field appears iff {@code privileged} or its
 * visibility is {@code "public"}.
 */
class SensitiveFieldPrivacyFilterProperties {

    private static final int CURRENT_YEAR = Year.now().getValue();

    /**
     * Property 20: {@code filteredFor} exposes each sensitive field exactly when the viewer is
     * privileged or the field's visibility is public, and always exposes the non-sensitive fields
     * and the visibility metadata unchanged.
     */
    @Property(tries = 300)
    void sensitiveFieldExposedIffPrivilegedOrPublic(
            @ForAll @From("persons") Person person, @ForAll boolean privileged) {

        PersonResponse response = PersonResponse.filteredFor(person, privileged);

        // ----- Independent oracle: a sensitive field is exposed iff privileged OR visibility public.
        boolean deathExposed = privileged || PersonVisibility.PUBLIC.equals(person.getVisDeath());
        boolean adoptionExposed =
                privileged || PersonVisibility.PUBLIC.equals(person.getVisAdoption());

        // Death status (sensitive, governed by vis_death): present (== stored) iff exposed, else null.
        if (deathExposed) {
            assertThat(response.deathStatus()).isEqualTo(person.isDeathStatus());
        } else {
            assertThat(response.deathStatus()).isNull();
        }

        // Adoption status (sensitive, governed by vis_adoption): present (== stored) iff exposed.
        if (adoptionExposed) {
            assertThat(response.adoptionStatus()).isEqualTo(person.getAdoptionStatus());
        } else {
            assertThat(response.adoptionStatus()).isNull();
        }

        // ----- Non-sensitive fields are ALWAYS present and equal to the stored values (14.4, 14.5).
        assertThat(response.id()).isEqualTo(person.getId());
        assertThat(response.treeId()).isEqualTo(person.getTreeId());
        assertThat(response.displayName()).isEqualTo(person.getDisplayName());
        assertThat(response.gender()).isEqualTo(person.getGender());
        assertThat(response.birthOrder()).isEqualTo(person.getBirthOrder());
        assertThat(response.birthYear()).isEqualTo(person.getBirthYear());

        // ----- Visibility metadata is non-sensitive and ALWAYS returned unchanged.
        assertThat(response.visMarital()).isEqualTo(person.getVisMarital());
        assertThat(response.visAdoption()).isEqualTo(person.getVisAdoption());
        assertThat(response.visDeath()).isEqualTo(person.getVisDeath());
    }

    // --------------------------------------------------------------------------------------------
    // Generators
    // --------------------------------------------------------------------------------------------

    /**
     * A person with random non-sensitive fields, random sensitive field values, and random
     * per-field visibility settings drawn from the closed {private, public} domain.
     */
    @Provide
    Arbitrary<Person> persons() {
        Arbitrary<String> displayNames = Arbitraries.strings().ofMinLength(1).ofMaxLength(100);
        Arbitrary<String> genders = Arbitraries.of("male", "female");
        Arbitrary<Integer> birthOrders = Arbitraries.integers().between(1, 99).injectNull(0.3);
        Arbitrary<Integer> birthYears =
                Arbitraries.integers().between(1000, CURRENT_YEAR).injectNull(0.3);
        Arbitrary<Boolean> deathStatuses = Arbitraries.of(Boolean.TRUE, Boolean.FALSE);
        Arbitrary<Boolean> adoptionStatuses =
                Arbitraries.of(Boolean.TRUE, Boolean.FALSE).injectNull(0.3);
        Arbitrary<String> visibilities =
                Arbitraries.of(PersonVisibility.PRIVATE, PersonVisibility.PUBLIC);

        return Combinators.combine(
                        displayNames,
                        genders,
                        birthOrders,
                        birthYears,
                        deathStatuses,
                        adoptionStatuses,
                        visibilities,
                        visibilities)
                .as(
                        (displayName,
                                gender,
                                birthOrder,
                                birthYear,
                                deathStatus,
                                adoptionStatus,
                                visAdoption,
                                visDeath) -> {
                            Person person = new Person(UUID.randomUUID(), displayName, gender);
                            person.setBirthOrder(birthOrder);
                            person.setBirthYear(birthYear);
                            person.setDeathStatus(deathStatus);
                            person.setAdoptionStatus(adoptionStatus);
                            // vis_marital is non-sensitive metadata here; vary it independently too.
                            person.setVisMarital(PersonVisibility.PRIVATE);
                            person.setVisAdoption(visAdoption);
                            person.setVisDeath(visDeath);
                            return person;
                        });
    }
}
