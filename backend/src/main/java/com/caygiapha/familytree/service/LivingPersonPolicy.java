package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.Person;
import java.time.Clock;
import java.time.ZoneOffset;
import org.springframework.stereotype.Component;

/**
 * Derives whether a {@link Person} is a <em>Living_Person</em> for privacy purposes (Requirement
 * 20.1). The name placeholder shown when a living person is redacted lives in the DTO layer
 * ({@code PersonResponse.REDACTED_NAME_PLACEHOLDER}, 20.2).
 *
 * <p>A person is treated as living unless their death status is true or their birth year is more
 * than 100 years before the current year. An unknown birth year therefore defaults to "living",
 * which is the protective choice. The current year is read from the injected {@link Clock} (UTC),
 * consistent with the rest of the time-dependent domain.
 */
@Component
public class LivingPersonPolicy {

    /** Maximum age (years) before a person with a known birth year is treated as not-living. */
    public static final int LIVING_AGE_LIMIT_YEARS = 100;

    private final Clock clock;

    public LivingPersonPolicy(Clock clock) {
        this.clock = clock;
    }

    /**
     * Whether the given person is a Living_Person (Requirement 20.1): not recorded as deceased and
     * either without a birth year or born within the last {@value #LIVING_AGE_LIMIT_YEARS} years.
     */
    public boolean isLiving(Person person) {
        if (person == null || person.isDeathStatus()) {
            return false;
        }
        Integer birthYear = person.getBirthYear();
        if (birthYear == null) {
            return true; // unknown age — protect by default.
        }
        int currentYear = clock.instant().atZone(ZoneOffset.UTC).getYear();
        return birthYear > currentYear - LIVING_AGE_LIMIT_YEARS;
    }
}
