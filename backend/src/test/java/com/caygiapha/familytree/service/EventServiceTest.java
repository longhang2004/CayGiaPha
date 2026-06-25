package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.UpcomingEventResponse;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.security.AuthorizationService.Role;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class EventServiceTest {

    private PersonRepository personRepository;
    private StubAuthorizationService authorizationService;
    private EventService eventService;
    private final UUID treeId = UUID.randomUUID();

    private static class StubAuthorizationService extends AuthorizationService {
        private Role roleToReturn = Role.NEITHER;

        public StubAuthorizationService() {
            super(null, null, null, null, null);
        }

        public void setRole(Role role) {
            this.roleToReturn = role;
        }

        @Override
        public Role classify(UUID treeId, UUID personId) {
            return roleToReturn;
        }
    }

    @BeforeEach
    void setUp() {
        personRepository = mock(PersonRepository.class);
        authorizationService = new StubAuthorizationService();
        eventService = new EventService(personRepository, authorizationService);
    }

    @Test
    void calculateNextAnniversarySolarFutureThisYear() {
        LocalDate today = LocalDate.now();
        LocalDate target = today.plusDays(5);
        LocalDate next = eventService.calculateNextAnniversary(target.getDayOfMonth(), target.getMonthValue(), "solar", false);
        assertThat(next).isEqualTo(target);
    }

    @Test
    void calculateNextAnniversarySolarPassedThisYear() {
        LocalDate today = LocalDate.now();
        LocalDate target = today.minusDays(5);
        LocalDate next = eventService.calculateNextAnniversary(target.getDayOfMonth(), target.getMonthValue(), "solar", false);
        assertThat(next).isEqualTo(target.plusYears(1));
    }

    @Test
    void calculateNextAnniversarySolarLeapYearFallback() {
        LocalDate next = eventService.calculateNextAnniversary(29, 2, "solar", false);
        assertThat(next.getMonthValue()).isEqualTo(2);
        if (next.isLeapYear()) {
            assertThat(next.getDayOfMonth()).isEqualTo(29);
        } else {
            assertThat(next.getDayOfMonth()).isEqualTo(28);
        }
    }

    @Test
    void calculateNextAnniversaryLunarDate() {
        LocalDate next = eventService.calculateNextAnniversary(15, 8, "lunar", false);
        assertThat(next).isNotNull();
        assertThat(next).isAfterOrEqualTo(LocalDate.now());
    }

    @Test
    void getUpcomingEventsPrivacyGates() {
        UUID personPublicId = UUID.randomUUID();
        Person personPublic = new Person(treeId, "Public Person", "male");
        setId(personPublic, personPublicId);
        personPublic.setDeathStatus(true);
        personPublic.setDeathDay(10);
        personPublic.setDeathMonth(5);
        personPublic.setDeathCalendar("solar");
        personPublic.setVisDeath("public");

        UUID personPrivateId = UUID.randomUUID();
        Person personPrivate = new Person(treeId, "Private Person", "female");
        setId(personPrivate, personPrivateId);
        personPrivate.setDeathStatus(true);
        personPrivate.setDeathDay(12);
        personPrivate.setDeathMonth(5);
        personPrivate.setDeathCalendar("solar");
        personPrivate.setVisDeath("private");

        when(personRepository.findByTreeIdAndDeathStatusTrue(treeId))
                .thenReturn(List.of(personPublic, personPrivate));

        authorizationService.setRole(Role.NEITHER);

        List<UpcomingEventResponse> events = eventService.getUpcomingEvents(treeId, 365);
        assertThat(events).hasSize(1);
        assertThat(events.get(0).personId()).isEqualTo(personPublicId);

        authorizationService.setRole(Role.OWNER);

        events = eventService.getUpcomingEvents(treeId, 365);
        assertThat(events).hasSize(2);
    }

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
