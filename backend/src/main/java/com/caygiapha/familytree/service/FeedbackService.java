package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.FeedbackMessage;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.dto.FeedbackRequest.FeedbackAttachmentRequest;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.FeedbackMessageRepository;
import com.caygiapha.familytree.repository.UserRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthContextHolder;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Base64;
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
    private static final Pattern DATA_URL_PATTERN = Pattern.compile(
            "^data:(image/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$");
    private static final int MAX_ATTACHMENTS = 3;
    private static final int MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

    private final FeedbackMessageRepository feedbackRepository;
    private final UserRepository userRepository;
    private final AuthContextHolder authContextHolder;
    private final AuditService auditService;
    private final StorageService storageService;
    private final ImageProcessor imageProcessor;
    private final ObjectMapper objectMapper;

    public FeedbackService(
            FeedbackMessageRepository feedbackRepository,
            UserRepository userRepository,
            AuthContextHolder authContextHolder,
            AuditService auditService,
            StorageService storageService,
            ImageProcessor imageProcessor,
            ObjectMapper objectMapper) {
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
        this.authContextHolder = authContextHolder;
        this.auditService = auditService;
        this.storageService = storageService;
        this.imageProcessor = imageProcessor;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public FeedbackMessage submit(String email, String category, String message, String attachmentKeys) {
        return submit(email, category, message, attachmentKeys, null);
    }

    @Transactional
    public FeedbackMessage submit(
            String email,
            String category,
            String message,
            String attachmentKeys,
            List<FeedbackAttachmentRequest> attachments) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedCategory = normalizeCategory(category);
        String normalizedMessage = normalizeMessage(message);
        UUID userId = authContextHolder.current().userId();

        FeedbackMessage feedback = new FeedbackMessage(userId, normalizedEmail, normalizedCategory, normalizedMessage);
        feedback.setAttachmentKeys(normalizeAttachmentKeys(attachmentKeys));
        feedback = feedbackRepository.save(feedback);
        String storedAttachments = storeAttachments(feedback.getId(), attachments);
        if (storedAttachments != null) {
            feedback.setAttachmentKeys(storedAttachments);
            feedback = feedbackRepository.save(feedback);
        }
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

    @Transactional(readOnly = true)
    public ServedFeedbackAttachment serveAttachment(UUID feedbackId, int index) {
        requireAdmin();
        if (feedbackId == null) {
            throw ApiException.validation("id", "Feedback id is required.");
        }
        if (index < 0) {
            throw ApiException.validation("index", "Attachment index is invalid.");
        }
        FeedbackMessage feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> ApiException.nodeNotAccessible("Feedback not found."));
        List<StoredFeedbackAttachment> attachments = parseStoredAttachments(feedback.getAttachmentKeys());
        if (index >= attachments.size()) {
            throw ApiException.nodeNotAccessible("Feedback attachment not found.");
        }
        StoredFeedbackAttachment attachment = attachments.get(index);
        if (attachment.objectKey() == null || attachment.objectKey().isBlank()
                || attachment.contentType() == null || attachment.contentType().isBlank()) {
            throw ApiException.nodeNotAccessible("Feedback attachment not found.");
        }
        return new ServedFeedbackAttachment(
                attachment.contentType(),
                storageService.get(attachment.objectKey()));
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

    private String storeAttachments(UUID feedbackId, List<FeedbackAttachmentRequest> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return null;
        }
        if (attachments.size() > MAX_ATTACHMENTS) {
            throw ApiException.validation("attachments", "Mỗi feedback chỉ được gửi tối đa 3 ảnh.");
        }

        List<StoredFeedbackAttachment> stored = new ArrayList<>();
        for (int i = 0; i < attachments.size(); i++) {
            FeedbackAttachmentRequest attachment = attachments.get(i);
            ParsedDataUrl parsed = parseDataUrl(attachment == null ? null : attachment.dataUrl());
            ImageProcessor.ProcessedImage image = imageProcessor.process(parsed.bytes());
            String objectKey = "feedback/" + feedbackId + "/" + UUID.randomUUID();
            storageService.put(objectKey, image.bytes(), image.contentType());
            stored.add(new StoredFeedbackAttachment(
                    objectKey,
                    image.contentType(),
                    normalizeAttachmentName(attachment == null ? null : attachment.name(), i),
                    image.bytes().length));
        }

        try {
            return objectMapper.writeValueAsString(stored);
        } catch (JsonProcessingException e) {
            throw ApiException.validation("attachments", "Ảnh feedback không hợp lệ.");
        }
    }

    private ParsedDataUrl parseDataUrl(String dataUrl) {
        if (dataUrl == null) {
            throw ApiException.validation("attachments", "Ảnh feedback không hợp lệ.");
        }
        java.util.regex.Matcher matcher = DATA_URL_PATTERN.matcher(dataUrl);
        if (!matcher.matches()) {
            throw ApiException.validation("attachments", "Chỉ hỗ trợ ảnh PNG hoặc JPEG.");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(matcher.group(2));
        } catch (IllegalArgumentException e) {
            throw ApiException.validation("attachments", "Ảnh feedback không hợp lệ.");
        }
        if (bytes.length > MAX_ATTACHMENT_BYTES) {
            throw ApiException.validation("attachments", "Mỗi ảnh feedback tối đa 2MB.");
        }
        return new ParsedDataUrl(matcher.group(1), bytes);
    }

    private List<StoredFeedbackAttachment> parseStoredAttachments(String attachmentKeys) {
        if (attachmentKeys == null || attachmentKeys.isBlank()) {
            return List.of();
        }
        try {
            List<StoredFeedbackAttachment> parsed = objectMapper.readValue(
                    attachmentKeys,
                    new TypeReference<List<StoredFeedbackAttachment>>() {});
            return parsed == null ? List.of() : parsed;
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private static String normalizeAttachmentName(String name, int index) {
        String normalized = name == null ? "" : name.trim();
        if (normalized.isEmpty()) {
            return "feedback-" + (index + 1);
        }
        return normalized.length() > 120 ? normalized.substring(0, 120) : normalized;
    }

    private record ParsedDataUrl(String contentType, byte[] bytes) {}

    private record StoredFeedbackAttachment(
            String objectKey,
            String contentType,
            String originalName,
            long byteSize) {}

    public record ServedFeedbackAttachment(String contentType, byte[] bytes) {}
}
