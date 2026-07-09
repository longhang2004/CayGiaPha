package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.entity.InAppReminder;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.InAppReminderRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthContextHolder;
import com.caygiapha.familytree.service.ReminderService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reminders")
public class ReminderController {

    private final InAppReminderRepository reminderRepository;
    private final ReminderService reminderService;
    private final AuthContextHolder authContextHolder;

    public ReminderController(
            InAppReminderRepository reminderRepository,
            ReminderService reminderService,
            AuthContextHolder authContextHolder) {
        this.reminderRepository = reminderRepository;
        this.reminderService = reminderService;
        this.authContextHolder = authContextHolder;
    }

    @GetMapping
    public List<InAppReminder> getMyReminders() {
        AuthContext context = authContextHolder.current();
        if (!context.isAuthenticated()) {
            throw ApiException.notAuthorized("Vui lòng đăng nhập để xem thông báo.");
        }
        return reminderRepository.findByUserIdOrderByCreatedAtDesc(context.userId());
    }

    @PatchMapping("/{id}/read")
    public InAppReminder markAsRead(@PathVariable("id") UUID id) {
        AuthContext context = authContextHolder.current();
        if (!context.isAuthenticated()) {
            throw ApiException.notAuthorized("Vui lòng đăng nhập.");
        }
        InAppReminder reminder = reminderRepository.findById(id)
                .orElseThrow(() -> ApiException.validation("id", "Thông báo không tồn tại."));
        if (!reminder.getUserId().equals(context.userId())) {
            throw ApiException.notAuthorized("Bạn không có quyền chỉnh sửa thông báo này.");
        }
        reminder.setRead(true);
        return reminderRepository.save(reminder);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReminder(@PathVariable("id") UUID id) {
        AuthContext context = authContextHolder.current();
        if (!context.isAuthenticated()) {
            throw ApiException.notAuthorized("Vui lòng đăng nhập.");
        }
        InAppReminder reminder = reminderRepository.findById(id)
                .orElseThrow(() -> ApiException.validation("id", "Thông báo không tồn tại."));
        if (!reminder.getUserId().equals(context.userId())) {
            throw ApiException.notAuthorized("Bạn không có quyền xóa thông báo này.");
        }
        reminderRepository.delete(reminder);
    }

    @PostMapping("/trigger-check")
    public int triggerCheck() {
        AuthContext context = authContextHolder.current();
        if (!context.isAuthenticated()) {
            throw ApiException.notAuthorized("Vui lòng đăng nhập.");
        }
        // Only generate reminders for the authenticated user, not the whole system.
        return reminderService.generateRemindersForUser(context.userId());
    }
}
