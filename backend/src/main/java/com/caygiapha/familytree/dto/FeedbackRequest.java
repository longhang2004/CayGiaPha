package com.caygiapha.familytree.dto;

import java.util.List;

/** Public feedback submission payload. */
public record FeedbackRequest(
        String email,
        String category,
        String message,
        String attachmentKeys,
        List<FeedbackAttachmentRequest> attachments) {

    /** Browser-submitted feedback screenshot/image payload. */
    public record FeedbackAttachmentRequest(String name, String dataUrl) {}
}
