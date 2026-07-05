package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.FeedbackMessage;
import java.time.Instant;
import java.util.UUID;

/** Feedback inbox response. */
public record FeedbackResponse(
        UUID id,
        UUID userId,
        String email,
        String category,
        String message,
        String status,
        String adminNote,
        Instant createdAt,
        Instant updatedAt) {

    public static FeedbackResponse from(FeedbackMessage feedback) {
        return new FeedbackResponse(
                feedback.getId(),
                feedback.getUserId(),
                feedback.getEmail(),
                feedback.getCategory(),
                feedback.getMessage(),
                feedback.getStatus(),
                feedback.getAdminNote(),
                feedback.getCreatedAt(),
                feedback.getUpdatedAt());
    }
}
