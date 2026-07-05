package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.dto.FeedbackRequest;
import com.caygiapha.familytree.dto.FeedbackResponse;
import com.caygiapha.familytree.entity.FeedbackMessage;
import com.caygiapha.familytree.service.FeedbackService;
import com.caygiapha.familytree.service.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Public feedback endpoint for bug reports, feature requests, and other comments. */
@RestController
@RequestMapping("/api/v1/feedback")
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final RateLimiter rateLimiter;

    public FeedbackController(FeedbackService feedbackService, RateLimiter rateLimiter) {
        this.feedbackService = feedbackService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FeedbackResponse submit(@RequestBody FeedbackRequest request, HttpServletRequest http) {
        String email = request == null ? "" : request.email();
        String remoteAddr = http == null ? "" : http.getRemoteAddr();
        rateLimiter.check("feedback:" + (email == null || email.isBlank() ? remoteAddr : email));
        rateLimiter.check("feedback-ip:" + remoteAddr);
        FeedbackMessage feedback = feedbackService.submit(
                request == null ? null : request.email(),
                request == null ? null : request.category(),
                request == null ? null : request.message(),
                request == null ? null : request.attachmentKeys());
        return FeedbackResponse.from(feedback);
    }
}
