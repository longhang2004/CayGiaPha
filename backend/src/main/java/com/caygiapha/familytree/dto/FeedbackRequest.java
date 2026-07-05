package com.caygiapha.familytree.dto;

/** Public feedback submission payload. */
public record FeedbackRequest(String email, String category, String message, String attachmentKeys) {}
