package com.caygiapha.familytree.service;

import com.caygiapha.familytree.dto.UpcomingEventResponse;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.security.AuthorizationService.Role;
import com.caygiapha.familytree.util.VietCalendar;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class EventService {

    private final PersonRepository personRepository;
    private final AuthorizationService authorizationService;

    public EventService(
            PersonRepository personRepository,
            AuthorizationService authorizationService) {
        this.personRepository = personRepository;
        this.authorizationService = authorizationService;
    }

    /**
     * Retrieve all upcoming death anniversaries (Ngày Giỗ) in the tree for the next daysAhead days.
     */
    public List<UpcomingEventResponse> getUpcomingEvents(UUID treeId, int daysAhead) {
        List<Person> deceased = personRepository.findByTreeIdAndDeathStatusTrue(treeId);
        List<UpcomingEventResponse> events = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (Person person : deceased) {
            // Check visibility of death status
            boolean privileged = authorizationService.classify(treeId, person.getId()) != Role.NEITHER;
            if (!privileged && "private".equals(person.getVisDeath())) {
                continue; // Privacy gate: skip private death status
            }

            Integer day = person.getDeathDay();
            Integer month = person.getDeathMonth();
            if (day == null || month == null) {
                continue; // No date recorded
            }

            LocalDate nextAnniversary = calculateNextAnniversary(
                    day, month, person.getDeathCalendar(), Boolean.TRUE.equals(person.getDeathLunarLeap()));

            if (nextAnniversary == null) {
                continue;
            }

            long diff = ChronoUnit.DAYS.between(today, nextAnniversary);
            if (diff >= 0 && diff <= daysAhead) {
                String originalDate = formatOriginalDeathDate(day, month, person.getDeathCalendar(), Boolean.TRUE.equals(person.getDeathLunarLeap()));
                events.add(new UpcomingEventResponse(
                        person.getId(),
                        person.getDisplayName(),
                        "", // Client will resolve relationship or nickname
                        "death_anniversary",
                        nextAnniversary,
                        originalDate,
                        (int) diff
                ));
            }
        }

        events.sort(Comparator.comparing(UpcomingEventResponse::eventDate));
        return events;
    }

    /**
     * Compute the next upcoming solar date for an anniversary, resolving leap fallbacks.
     */
    public LocalDate calculateNextAnniversary(int day, int month, String calendar, boolean leap) {
        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();

        if ("solar".equals(calendar)) {
            LocalDate anniversary = getSolarDateWithFallback(currentYear, month, day);
            if (anniversary.isBefore(today)) {
                anniversary = getSolarDateWithFallback(currentYear + 1, month, day);
            }
            return anniversary;
        } else {
            LocalDate nextAnniversary = null;
            // The anniversary can fall in lunarYear = currentYear - 1 (e.g. late lunar months), currentYear, or currentYear + 1.
            for (int y = currentYear - 1; y <= currentYear + 1; y++) {
                int[] solar = VietCalendar.convertLunar2Solar(day, month, y, leap ? 1 : 0, 7.0);
                if (solar[0] == 0 && leap) {
                    // Fallback to regular month if leap month is invalid for this year
                    solar = VietCalendar.convertLunar2Solar(day, month, y, 0, 7.0);
                }
                if (solar[0] != 0) {
                    LocalDate solarDate = LocalDate.of(solar[2], solar[1], solar[0]);
                    if (!solarDate.isBefore(today)) {
                        if (nextAnniversary == null || solarDate.isBefore(nextAnniversary)) {
                            nextAnniversary = solarDate;
                        }
                    }
                }
            }
            return nextAnniversary;
        }
    }

    private LocalDate getSolarDateWithFallback(int year, int month, int day) {
        if (month == 2 && day == 29) {
            boolean isLeap = LocalDate.of(year, 1, 1).isLeapYear();
            return isLeap ? LocalDate.of(year, 2, 29) : LocalDate.of(year, 2, 28);
        }
        return LocalDate.of(year, month, day);
    }

    private String formatOriginalDeathDate(int day, int month, String calendar, boolean leap) {
        if ("solar".equals(calendar)) {
            return String.format("%02d/%02d (Dương lịch)", day, month);
        } else {
            return String.format("Ngày %d tháng %d %sÂm lịch", day, month, leap ? "(Nhuận) " : "");
        }
    }
}
