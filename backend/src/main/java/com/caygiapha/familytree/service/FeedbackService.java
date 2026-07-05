package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.FeedbackMessage;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.FeedbackMessageRepository;
import com.caygiapha.familytree.repository.UserRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthContextHolder;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Public feedback submission and admin inbox operations. */
@Service
public class FeedbackService {

    private static final Set<String> CATEGORIES = Set.of("bug", "feature", "other");
    private static final Set<String> STATUSES = Set.of("new", "reviewed", "resolved");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final FeedbackMessageRepository feedbackRepository;
    private final UserRepository userRepository;
    private final AuthContextHolder authContextHolder;
    private final AuditService auditService;

    public FeedbackService(
            FeedbackMessageRepository feedbackRepository,
            UserRepository userRepository,
            AuthContextHolder authContextHolder,
            AuditService auditService) {
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
        this.authContextHolder = authContextHolder;
        this.auditService = auditService;
    }

    @Transactional
    public FeedbackMessage submit(String email, String category, String message, String attachmentKeys) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedCategory = normalizeCategory(category);
        String normalizedMessage = normalizeMessage(message);
        String normalizedAttachmentKeys = normalizeAttachmentKeys(attachmentKeys);
        UUID userId = authContextHolder.current().userId();

        FeedbackMessage feedback = new FeedbackMessage(userId, normalizedEmail, normalizedCategory, normalizedMessage);
        feedback.setAttachmentKeys(normalizedAttachmentKeys);
        feedback = feedbackRepository.save(feedback);
        auditService.record(AuditService.FEEDBACK_SUBMITTED, "feedback", feedback.getId());
        return feedback;
    }

    @Transactional(readOnly = true)
    public List<FeedbackMessage> recentForAdmin() {
        requireAdmin();
        return feedbackRepository.findTop50ByOrderByCreatedAtDesc();
    }

    @Transactional
    public FeedbackMessage updateStatus(UUID feedbackId, String status, String adminNote) {
        requireAdmin();
        if (feedbackId == null) {
            throw ApiException.validation("id", "Feedback id is required.");
        }
        String normalizedStatus = normalizeStatus(status);
        String normalizedAdminNote = normalizeOptional(adminNote);
        FeedbackMessage feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> ApiException.missingNode("id", "Feedback message not found."));
        feedback.updateStatus(normalizedStatus, normalizedAdminNote);
        auditService.record(AuditService.FEEDBACK_STATUS_CHANGED, "feedback", feedback.getId(), normalizedStatus);
        return feedback;
    }

    private void requireAdmin() {
        AuthContext context = authContextHolder.current();
        if (!context.isAuthenticated()) {
            throw ApiException.notAuthorized("Authentication is required for this operation.");
        }
        User user = userRepository.findById(context.userId())
                .orElseThrow(() -> ApiException.notAuthorized("Authentication is required for this operation."));
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw ApiException.notAuthorized("Only admins may perform this operation.");
        }
    }

    private static String normalizeEmail(String email) {
        String normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() > 254 || !EMAIL_PATTERN.matcher(normalized).matches()) {
            throw ApiException.validation("email", "Vui lòng nhập email hợp lệ.");
        }
        return normalized;
    }

    private static String normalizeCategory(String category) {
        String normalized = category == null ? "" : category.trim().toLowerCase(Locale.ROOT);
        return CATEGORIES.contains(normalized) ? normalized : "other";
    }

    private static String normalizeStatus(String status) {
        String normalized = status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
        if (!STATUSES.contains(normalized)) {
            throw ApiException.validation("status", "Status must be new, reviewed, or resolved.");
        }
        return normalized;
    }

    private static String normalizeMessage(String message) {
        String normalized = message == null ? "" : message.trim();
        if (normalized.length() < 10) {
            throw ApiException.validation("message", "Vui lòng mô tả feedback ít nhất 10 ký tự.");
        }
        if (normalized.length() > 4000) {
            throw ApiException.validation("message", "Feedback tối đa 4000 ký tự.");
        }
        return normalized;
    }

    private static String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private static String normalizeAttachmentKeys(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > 8000) {
            throw ApiException.validation("attachmentKeys", "Feedback attachment metadata is too large.");
        }
        return normalized.isEmpty() ? null : normalized;
    }
}
