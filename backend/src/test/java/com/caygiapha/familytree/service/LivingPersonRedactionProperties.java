package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.dto.PersonResponse;
import com.caygiapha.familytree.entity.Person;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based test for design <strong>Property 27: Living-person redaction</strong>.
 *
 * <p>Feature: vietnamese-family-tree, Property 27
 *
 * <p>For <em>any</em> person and viewer, a Living_Person's birth year/order are omitted and their
 * name is the placeholder <em>if and only if</em> the person is a Living_Person (Requirement 20.1:
 * not deceased and born within 100 years, or unknown birth year), the viewer is non-privileged, and
 * the tree enables living redaction; a not-living person is never redacted by this rule (20.3).
 *
 * <p>Uses a fixed clock so "within 100 years" is deterministic, and checks both the
 * {@link LivingPersonPolicy} derivation and the {@link PersonResponse} projection against an
 * independent oracle.
 */
class LivingPersonRedactionProperties {

    private static final int CURRENT_YEAR = 2026;
    private static final Clock FIXED = Clock.fixed(
            Instant.parse(CURRENT_YEAR + "-06-15T00:00:00Z"), ZoneOffset.UTC);
    private final LivingPersonPolicy policy = new LivingPersonPolicy(FIXED);

    record Scenario(boolean death, Integer birthYear, Integer birthOrder,
                    boolean privileged, boolean redactionEnabled) {}

    @Property(tries = 500)
    void redactedIffLivingAndNonPrivilegedAndEnabled(@ForAll("scenarios") Scenario s) {
        Person person = new Person(java.util.UUID.randomUUID(), "Nguyễn Văn A", "male");
        person.setDeathStatus(s.death());
        person.setBirthYear(s.birthYear());
        person.setBirthOrder(s.birthOrder());

        boolean expectedLiving =
                !s.death() && (s.birthYear() == null || s.birthYear() > CURRENT_YEAR - 100);
        assertThat(policy.isLiving(person)).isEqualTo(expectedLiving); // 20.1

        boolean redactLiving = !s.privileged() && s.redactionEnabled() && expectedLiving;
        PersonResponse body =
                PersonResponse.filteredFor(person, s.privileged(), redactLiving);

        if (redactLiving) {
            assertThat(body.displayName()).isEqualTo(PersonResponse.REDACTED_NAME_PLACEHOLDER);
            assertThat(body.birthYear()).isNull();
            assertThat(body.birthOrder()).isNull();
        } else {
            assertThat(body.displayName()).isEqualTo("Nguyễn Văn A");
            assertThat(body.birthYear()).isEqualTo(s.birthYear());
            assertThat(body.birthOrder()).isEqualTo(s.birthOrder());
        }
        // Gender is never redacted by the living rule.
        assertThat(body.gender()).isEqualTo("male");
    }

    @Provide
    Arbitrary<Scenario> scenarios() {
        Arbitrary<Boolean> death = Arbitraries.of(true, false);
        // Birth years spanning >100 years ago, within 100 years, edge, and unknown (null).
        Arbitrary<Integer> birthYear = Arbitraries.of(
                null, 1000, 1900, CURRENT_YEAR - 101, CURRENT_YEAR - 100, CURRENT_YEAR - 99,
                CURRENT_YEAR - 1, CURRENT_YEAR);
        Arbitrary<Integer> birthOrder = Arbitraries.of(null, 1, 5);
        Arbitrary<Boolean> privileged = Arbitraries.of(true, false);
        Arbitrary<Boolean> redaction = Arbitraries.of(true, false);
        return Combinators.combine(death, birthYear, birthOrder, privileged, redaction)
                .as(Scenario::new);
    }
}
