package com.caygiapha.familytree.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.Person;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based test for design <strong>Property 28: Extended field-visibility filter</strong>.
 *
 * <p>Feature: vietnamese-family-tree, Property 28
 *
 * <p>For <em>any</em> person with arbitrary {@code vis_name}/{@code vis_birth_year} settings and
 * <em>any</em> viewer, a governed field is included <em>if and only if</em> the viewer is privileged
 * or that field's visibility is {@code public} (Requirement 21.3); a {@code private} display name is
 * replaced by the placeholder for non-privileged viewers (21.4). Isolated from Living_Person
 * redaction (redactLiving = false) so the per-field rule is checked on its own.
 */
class ExtendedFieldVisibilityProperties {

    record Scenario(String visName, String visBirthYear, boolean privileged) {}

    @Property(tries = 300)
    void governedFieldIncludedIffPrivilegedOrPublic(@ForAll("scenarios") Scenario s) {
        Person person = new Person(UUID.randomUUID(), "Trần Thị B", "female");
        person.setBirthYear(1990);
        person.setVisName(s.visName());
        person.setVisBirthYear(s.visBirthYear());

        PersonResponse body = PersonResponse.filteredFor(person, s.privileged(), false);

        boolean nameVisible = s.privileged() || PersonVisibility.PUBLIC.equals(s.visName());
        boolean birthYearVisible =
                s.privileged() || PersonVisibility.PUBLIC.equals(s.visBirthYear());

        if (nameVisible) {
            assertThat(body.displayName()).isEqualTo("Trần Thị B");
        } else {
            assertThat(body.displayName()).isEqualTo(PersonResponse.REDACTED_NAME_PLACEHOLDER); // 21.4
        }
        assertThat(body.birthYear()).isEqualTo(birthYearVisible ? 1990 : null); // 21.3
        // The visibility settings themselves are always returned as editable metadata.
        assertThat(body.visName()).isEqualTo(s.visName());
        assertThat(body.visBirthYear()).isEqualTo(s.visBirthYear());
    }

    @Provide
    Arbitrary<Scenario> scenarios() {
        Arbitrary<String> vis = Arbitraries.of(PersonVisibility.PRIVATE, PersonVisibility.PUBLIC);
        Arbitrary<Boolean> privileged = Arbitraries.of(true, false);
        return Combinators.combine(vis, vis, privileged).as(Scenario::new);
    }
}
