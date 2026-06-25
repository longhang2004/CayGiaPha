package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.InAppReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface InAppReminderRepository extends JpaRepository<InAppReminder, UUID> {
    List<InAppReminder> findByUserIdOrderByCreatedAtDesc(UUID userId);
    boolean existsByUserIdAndPersonIdAndAnniversaryDateAndDaysUntil(UUID userId, UUID personId, LocalDate anniversaryDate, int daysUntil);
}
