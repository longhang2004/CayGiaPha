package com.caygiapha.familytree.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.Person;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the server-side privacy filter in {@link PersonResponse} (Requirements 14.3, 14.4,
 * 14.5). The filter governs whether the sensitive person fields ({@code deathStatus} via
 * {@code vis_death}; {@code adoptionStatus} via {@code vis_adoption}) appear in a read response:
 *
 * <ul>
 *   <li>a privileged viewer (owner / linked claimed-node user) sees every sensitive field
 *       regardless of its visibility setting (14.3);</li>
 *   <li>a non-privileged viewer sees a sensitive field only when its visibility is
 *       {@code "public"} (14.5) and never when it is {@code "private"} (14.4);</li>
 *   <li>non-sensitive fields are always returned for any viewer (14.4).</li>
 * </ul>
 */
class PersonResponsePrivacyFilterTest {

    private static Person person(String visDeath, String visAdoption) {
        Person p = new Person(UUID.randomUUID(), "Nguyen Van A", "male");
        p.setBirthOrder(2);
        p.setBirthYear(1990);
        p.setDeathStatus(true);
        p.setAdoptionStatus(true);
        p.setVisDeath(visDeath);
        p.setVisAdoption(visAdoption);
        return p;
    }

    @Test
    void privilegedViewerSeesPrivateSensitiveFields() {
        // 14.3 — owner / linked user sees private fields.
        Person p = person(PersonVisibility.PRIVATE, PersonVisibility.PRIVATE);

        PersonResponse response = PersonResponse.filteredFor(p, true);

        assertThat(response.deathStatus()).isTrue();
        assertThat(response.adoptionStatus()).isTrue();
    }

    @Test
    void nonPrivilegedViewerDoesNotSeePrivateSensitiveFields() {
        // 14.4 — a non-owner/non-linked viewer has each private sensitive field omitted (null).
        Person p = person(PersonVisibility.PRIVATE, PersonVisibility.PRIVATE);

        PersonResponse response = PersonResponse.filteredFor(p, false);

        assertThat(response.deathStatus()).isNull();
        assertThat(response.adoptionStatus()).isNull();
        // 14.4 — all non-private fields are still returned.
        assertThat(response.displayName()).isEqualTo("Nguyen Van A");
        assertThat(response.gender()).isEqualTo("male");
        assertThat(response.birthOrder()).isEqualTo(2);
        assertThat(response.birthYear()).isEqualTo(1990);
    }

    @Test
    void publicSensitiveFieldsAreAlwaysShownToNonPrivilegedViewer() {
        // 14.5 — a public sensitive field is included for any authorized viewer.
        Person p = person(PersonVisibility.PUBLIC, PersonVisibility.PUBLIC);

        PersonResponse response = PersonResponse.filteredFor(p, false);

        assertThat(response.deathStatus()).isTrue();
        assertThat(response.adoptionStatus()).isTrue();
    }

    @Test
    void filterIsAppliedPerFieldIndependently() {
        // 14.3-14.5 — mixed settings: public death is shown, private adoption is hidden.
        Person p = person(PersonVisibility.PUBLIC, PersonVisibility.PRIVATE);

        PersonResponse response = PersonResponse.filteredFor(p, false);

        assertThat(response.deathStatus()).isTrue(); // public → shown (14.5)
        assertThat(response.adoptionStatus()).isNull(); // private + non-privileged → hidden (14.4)
    }

    @Test
    void visibilitySettingsAreAlwaysReturnedAsMetadata() {
        Person p = person(PersonVisibility.PUBLIC, PersonVisibility.PRIVATE);

        PersonResponse response = PersonResponse.filteredFor(p, false);

        assertThat(response.visDeath()).isEqualTo(PersonVisibility.PUBLIC);
        assertThat(response.visAdoption()).isEqualTo(PersonVisibility.PRIVATE);
        assertThat(response.visMarital()).isEqualTo(PersonVisibility.PRIVATE); // entity default
    }
}
