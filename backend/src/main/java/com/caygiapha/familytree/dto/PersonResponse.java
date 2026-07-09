package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.Person;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.UUID;

/**
 * Response body for person read/create/edit endpoints (Requirements 3.1, 3.3, 14.3, 14.4, 14.5).
 *
 * <p>Carries the stored person fields so that a read after create/edit round-trips the persisted
 * values (design Property 5). It is also the projection point for the server-side privacy filter
 * (design "Privacy enforcement server-side"; Property 20):
 *
 * <ul>
 *   <li>Non-sensitive fields ({@code displayName}, {@code gender}, {@code birthOrder},
 *       {@code birthYear}) are always present for any authorized viewer (14.4 — "returning all
 *       non-private fields").</li>
 *   <li>Sensitive fields whose visibility governs exposure — {@code deathStatus} (governed by
 *       {@code vis_death}) and {@code adoptionStatus} (governed by {@code vis_adoption}) — are
 *       included only when the viewer is privileged (the tree Owner or the linked
 *       {@code Claimed_Node} user; 14.3) <em>or</em> when the field's visibility is
 *       {@code "public"} (14.5). For any other viewer a {@code "private"} sensitive field is
 *       {@code null} and, with {@link JsonInclude.Include#NON_NULL}, genuinely absent from the JSON
 *       (14.4).</li>
 * </ul>
 *
 * <p>Marital status is a property of the person's {@code Marriage_Edge} rather than of the person
 * row, so it is not projected here; its exposure is governed by {@code vis_marital} wherever
 * marriage data is surfaced. Per-field visibility settings are returned only to privileged viewers
 * (owner / linked / contributor) so public and link readers cannot learn privacy configuration.
 *
 * @param id             the person node identifier
 * @param treeId         owning tree
 * @param displayName    display name (1-100 chars)
 * @param gender         gender ({@code male}/{@code female})
 * @param birthOrder     birth order (1-99) or {@code null}
 * @param birthYear      birth year (1000-current year) or {@code null}
 * @param deathStatus    death status, or {@code null} when filtered out for the viewer (14.4)
 * @param adoptionStatus adoption status, or {@code null} when unset or filtered out (14.4)
 * @param visMarital     visibility of marital status ({@code private}/{@code public})
 * @param visAdoption    visibility of adoption status ({@code private}/{@code public})
 * @param visDeath       visibility of death status ({@code private}/{@code public})
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PersonResponse(
        UUID id,
        UUID treeId,
        String displayName,
        String gender,
        Integer birthOrder,
        Integer birthYear,
        Boolean deathStatus,
        Boolean adoptionStatus,
        String visMarital,
        String visAdoption,
        String visDeath,
        String visName,
        String visBirthYear,
        String visPhoto,
        Integer deathDay,
        Integer deathMonth,
        Integer deathYear,
        String deathCalendar,
        Boolean deathLunarLeap) {

    /** Placeholder shown in place of a redacted Living_Person's display name (Requirement 20.2). */
    public static final String REDACTED_NAME_PLACEHOLDER = "Người thân còn sống";

    /**
     * Project a person for a <em>privileged</em> viewer — the tree Owner or the linked
     * {@code Claimed_Node} user — who sees every field regardless of its visibility setting
     * (Requirement 14.3). Used by create/edit responses, which are only ever returned to a viewer
     * authorized to mutate the node.
     */
    public static PersonResponse forPrivilegedViewer(Person person) {
        return project(person, true, false);
    }

    /**
     * Project a person applying the server-side privacy filter for the given viewer
     * (Requirements 14.3, 14.4, 14.5).
     *
     * @param person     the person being read
     * @param privileged {@code true} when the viewer is the tree Owner or the linked
     *                   {@code Claimed_Node} user (sees all sensitive fields); {@code false}
     *                   otherwise (sees a sensitive field only when its visibility is public)
     */
    public static PersonResponse filteredFor(Person person, boolean privileged) {
        return project(person, privileged, false);
    }

    /**
     * Project a person applying the privacy filter and, additionally, Living_Person redaction
     * (Requirement 20.2). When {@code redactLiving} is true the display name is replaced with a
     * non-identifying placeholder and the birth year and birth order are omitted; the viewer is
     * necessarily non-privileged in that case. Sensitive fields continue to follow the per-field
     * visibility rules (14.3-14.5).
     *
     * @param person      the person being read
     * @param privileged  whether the viewer is the tree Owner or the linked {@code Claimed_Node}
     *                    user (sees all sensitive fields)
     * @param redactLiving whether Living_Person redaction applies for this viewer (20.2)
     */
    public static PersonResponse filteredFor(Person person, boolean privileged, boolean redactLiving) {
        return project(person, privileged, redactLiving);
    }

    private static PersonResponse project(Person person, boolean privileged, boolean redactLiving) {
        // 21.4 / 20.2 — name hidden by living redaction OR a private name visibility (non-privileged);
        // 21.3 / 20.2 — birth year hidden likewise; birth order is governed only by living redaction.
        boolean nameHidden = redactLiving
                || (!privileged && PersonVisibility.PRIVATE.equals(person.getVisName()));
        boolean birthYearHidden = redactLiving
                || (!privileged && PersonVisibility.PRIVATE.equals(person.getVisBirthYear()));
        boolean deathVisible = visible(privileged, person.getVisDeath());
        // Visibility settings are owner/editor metadata — omit for non-privileged viewers so
        // privacy configuration is not disclosed to public/link readers.
        String visMarital = privileged ? person.getVisMarital() : null;
        String visAdoption = privileged ? person.getVisAdoption() : null;
        String visDeath = privileged ? person.getVisDeath() : null;
        String visName = privileged ? person.getVisName() : null;
        String visBirthYear = privileged ? person.getVisBirthYear() : null;
        String visPhoto = privileged ? person.getVisPhoto() : null;
        return new PersonResponse(
                person.getId(),
                person.getTreeId(),
                nameHidden ? REDACTED_NAME_PLACEHOLDER : person.getDisplayName(),
                person.getGender(),
                redactLiving ? null : person.getBirthOrder(),
                birthYearHidden ? null : person.getBirthYear(),
                deathVisible ? person.isDeathStatus() : null,
                visible(privileged, person.getVisAdoption()) ? person.getAdoptionStatus() : null,
                visMarital,
                visAdoption,
                visDeath,
                visName,
                visBirthYear,
                visPhoto,
                deathVisible ? person.getDeathDay() : null,
                deathVisible ? person.getDeathMonth() : null,
                deathVisible ? person.getDeathYear() : null,
                deathVisible ? person.getDeathCalendar() : null,
                deathVisible ? person.getDeathLunarLeap() : null);
    }

    /**
     * Whether a sensitive field is exposed to the viewer: always for a privileged viewer (14.3),
     * otherwise only when its visibility setting is {@code "public"} (14.5); a {@code "private"}
     * setting omits it for any non-privileged viewer (14.4).
     */
    private static boolean visible(boolean privileged, String visibility) {
        return privileged || PersonVisibility.PUBLIC.equals(visibility);
    }
}
