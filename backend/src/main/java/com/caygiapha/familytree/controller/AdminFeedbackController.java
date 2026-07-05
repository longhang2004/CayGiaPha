package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.dto.FeedbackResponse;
import com.caygiapha.familytree.dto.FeedbackStatusUpdateRequest;
import com.caygiapha.familytree.entity.FeedbackMessage;
import com.caygiapha.familytree.service.FeedbackService;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin feedback inbox endpoints. */
@RestController
@RequestMapping("/api/v1/admin/feedback")
public class AdminFeedbackController {

    private final FeedbackService feedbackService;

    public AdminFeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @GetMapping
    public List<FeedbackResponse> list() {
        return feedbackService.recentForAdmin().stream()
                .map(FeedbackResponse::from)
                .toList();
    }

    @PatchMapping("/{id}")
    public FeedbackResponse update(
            @PathVariable("id") UUID id,
            @RequestBody FeedbackStatusUpdateRequest request) {
        FeedbackMessage feedback = feedbackService.updateStatus(
                id,
                request == null ? null : request.status(),
                request == null ? null : request.adminNote());
        return FeedbackResponse.from(feedback);
    }
}
