package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.InAppReminder;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.repository.ClaimRepository;
import com.caygiapha.familytree.repository.InAppReminderRepository;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReminderServiceTest {

    private PersonRepository personRepository;
    private TreeRepository treeRepository;
    private ClaimRepository claimRepository;
    private InAppReminderRepository reminderRepository;
    private StubEventService eventService;
    private ReminderService reminderService;

    private static class StubEventService extends EventService {
        private LocalDate nextAnniversary;

        public StubEventService() {
            super(null, null);
        }

        public void setNextAnniversary(LocalDate date) {
            this.nextAnniversary = date;
        }

        @Override
        public LocalDate calculateNextAnniversary(int day, int month, String calendar, boolean leap) {
            return nextAnniversary;
        }
    }

    @BeforeEach
    void setUp() {
        personRepository = mock(PersonRepository.class);
        treeRepository = mock(TreeRepository.class);
        claimRepository = mock(ClaimRepository.class);
        reminderRepository = mock(InAppReminderRepository.class);
        eventService = new StubEventService();
        reminderService = new ReminderService(
                personRepository, treeRepository, claimRepository, reminderRepository, eventService);
    }

    @Test
    void generateRemindersDispatchesToOwnerAndClaimedUsers() {
        UUID treeId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID claimedUserId = UUID.randomUUID();
        UUID personId = UUID.randomUUID();

        Person deceasedPerson = new Person(treeId, "Deceased Ancestor", "male");
        setId(deceasedPerson, personId);
        deceasedPerson.setDeathStatus(true);
        deceasedPerson.setDeathDay(15);
        deceasedPerson.setDeathMonth(8);
        deceasedPerson.setDeathCalendar("lunar");

        Tree tree = new Tree(ownerId);
        setTreeId(tree, treeId);

        when(personRepository.findAll()).thenReturn(List.of(deceasedPerson));
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));
        when(claimRepository.findUserIdsWithClaimsInTree(treeId)).thenReturn(List.of(claimedUserId));

        LocalDate anniversary = LocalDate.now().plusDays(7);
        eventService.setNextAnniversary(anniversary);

        when(reminderRepository.existsByUserIdAndPersonIdAndAnniversaryDateAndDaysUntil(
                any(UUID.class), eq(personId), eq(anniversary), eq(7)))
                .thenReturn(false);

        int count = reminderService.generateReminders();

        assertThat(count).isEqualTo(2);
        verify(reminderRepository, times(2)).save(any(InAppReminder.class));
    }

    @Test
    void generateRemindersPreventsDuplicates() {
        UUID treeId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID personId = UUID.randomUUID();

        Person deceasedPerson = new Person(treeId, "Deceased Ancestor", "male");
        setId(deceasedPerson, personId);
        deceasedPerson.setDeathStatus(true);
        deceasedPerson.setDeathDay(15);
        deceasedPerson.setDeathMonth(8);
        deceasedPerson.setDeathCalendar("lunar");

        Tree tree = new Tree(ownerId);
        setTreeId(tree, treeId);

        when(personRepository.findAll()).thenReturn(List.of(deceasedPerson));
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));

        LocalDate anniversary = LocalDate.now().plusDays(7);
        eventService.setNextAnniversary(anniversary);

        when(reminderRepository.existsByUserIdAndPersonIdAndAnniversaryDateAndDaysUntil(
                ownerId, personId, anniversary, 7))
                .thenReturn(true);

        int count = reminderService.generateReminders();

        assertThat(count).isZero();
        verify(reminderRepository, never()).save(any(InAppReminder.class));
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

    private static void setTreeId(Tree tree, UUID id) {
        try {
            var field = Tree.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(tree, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
