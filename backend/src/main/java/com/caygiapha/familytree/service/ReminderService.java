package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.InAppReminder;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.repository.ClaimRepository;
import com.caygiapha.familytree.repository.InAppReminderRepository;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class ReminderService {

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

    private final PersonRepository personRepository;
    private final TreeRepository treeRepository;
    private final ClaimRepository claimRepository;
    private final InAppReminderRepository reminderRepository;
    private final EventService eventService;

    public ReminderService(
            PersonRepository personRepository,
            TreeRepository treeRepository,
            ClaimRepository claimRepository,
            InAppReminderRepository reminderRepository,
            EventService eventService) {
        this.personRepository = personRepository;
        this.treeRepository = treeRepository;
        this.claimRepository = claimRepository;
        this.reminderRepository = reminderRepository;
        this.eventService = eventService;
    }

    /**
     * Daily background job at 6:00 AM.
     */
    @Scheduled(cron = "0 0 6 * * *")
    @Transactional
    public void generateRemindersScheduled() {
        log.info("Running scheduled death anniversary reminders generation...");
        generateReminders();
    }

    @Transactional
    public int generateReminders() {
        LocalDate today = LocalDate.now();
        List<Person> deceased = personRepository.findAll(); // Simple lookup to check all deceased
        int countCreated = 0;

        for (Person person : deceased) {
            if (!person.isDeathStatus()) {
                continue;
            }
            Integer day = person.getDeathDay();
            Integer month = person.getDeathMonth();
            if (day == null || month == null) {
                continue;
            }

            LocalDate nextAnniversary = eventService.calculateNextAnniversary(
                    day, month, person.getDeathCalendar(), Boolean.TRUE.equals(person.getDeathLunarLeap()));

            if (nextAnniversary == null) {
                continue;
            }

            long diff = ChronoUnit.DAYS.between(today, nextAnniversary);
            if (diff == 7 || diff == 3 || diff == 1 || diff == 0) {
                UUID treeId = person.getTreeId();
                Optional<Tree> treeOpt = treeRepository.findById(treeId);
                if (treeOpt.isEmpty()) {
                    continue;
                }
                Tree tree = treeOpt.get();

                // Build set of recipient user IDs
                Set<UUID> recipients = new HashSet<>();
                recipients.add(tree.getOwnerUserId());
                recipients.addAll(claimRepository.findUserIdsWithClaimsInTree(treeId));

                String originalDate = formatOriginalDeathDate(day, month, person.getDeathCalendar(), Boolean.TRUE.equals(person.getDeathLunarLeap()));

                for (UUID userId : recipients) {
                    // Check if already generated to prevent duplicates
                    boolean exists = reminderRepository.existsByUserIdAndPersonIdAndAnniversaryDateAndDaysUntil(
                            userId, person.getId(), nextAnniversary, (int) diff);
                    if (!exists) {
                        String title;
                        String content;
                        if (diff == 0) {
                            title = String.format("Hôm nay Giỗ: %s", person.getDisplayName());
                            content = String.format("Hôm nay ngày %02d/%02d là ngày giỗ (%s) của %s.", 
                                    nextAnniversary.getDayOfMonth(), nextAnniversary.getMonthValue(), originalDate, person.getDisplayName());
                        } else {
                            title = String.format("Sắp đến Giỗ: %s (sau %d ngày)", person.getDisplayName(), diff);
                            content = String.format("Ngày giỗ (%s) của %s sẽ diễn ra vào ngày %02d/%02d (sau %d ngày nữa).",
                                    originalDate, person.getDisplayName(), nextAnniversary.getDayOfMonth(), nextAnniversary.getMonthValue(), diff);
                        }

                        InAppReminder reminder = new InAppReminder(
                                userId, person.getId(), title, content, (int) diff, nextAnniversary);
                        reminderRepository.save(reminder);
                        countCreated++;
                    }
                }
            }
        }
        log.info("Generated {} new in-app reminders", countCreated);
        return countCreated;
    }

    private String formatOriginalDeathDate(int day, int month, String calendar, boolean leap) {
        if ("solar".equals(calendar)) {
            return String.format("%02d/%02d Dương lịch", day, month);
        } else {
            return String.format("ngày %d tháng %d %sÂm lịch", day, month, leap ? "(Nhuận) " : "");
        }
    }
}
