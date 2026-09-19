package com.caygiapha.familytree.error;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * The single JSON error envelope used by every error response:
 *
 * <pre>{@code
 * { "error": { "code": "VALIDATION_ERROR", "field": "phone", "message": "..." } }
 * }</pre>
 *
 * <p>The {@code field} member is omitted from the serialized output when it is {@code null} (i.e.
 * for errors that are not field-specific), so the frontend can rely on its presence meaning a
 * particular field was at fault.
 */
public record ErrorResponse(ApiError error, String type, String title, int status, String detail) {

    /**
     * Build an envelope for the given code, optional field, and human-readable message.
     *
     * @param code    the error category (its name becomes the {@code code} string)
     * @param field   the offending field, or {@code null} when not field-specific
     * @param message a human-readable, displayable message
     */
    public static ErrorResponse of(ErrorCode code, String field, String message) {
        return new ErrorResponse(
                new ApiError(code.name(), field, message),
                "https://docs.caygiapha.dev/problems/" + code.name(),
                titleFor(code),
                code.status().value(),
                message);
    }

    static String titleFor(ErrorCode code) {
        return switch (code) {
            case VALIDATION_ERROR -> "Validation error";
            case IDENTIFIER_TAKEN -> "Identifier taken";
            case ACCOUNT_NOT_FOUND -> "Account not found";
            case CODE_INVALID -> "Code invalid";
            case CODE_EXPIRED -> "Code expired";
            case TOO_MANY_ATTEMPTS -> "Too many attempts";
            case NOT_AUTHORIZED -> "Not authorized";
            case NODE_NOT_ACCESSIBLE -> "Node not accessible";
            case MISSING_NODE -> "Missing node";
            case SELF_REFERENCE -> "Self reference";
            case CYCLE_VIOLATION -> "Cycle violation";
            case PARENT_LIMIT -> "Parent limit";
            case ALREADY_CLAIMED -> "Already claimed";
            case CONSENT_REQUIRED -> "Consent required";
            case INTERNAL_ERROR -> "Internal error";
        };
    }

    /**
     * The inner error object carrying the machine-readable code, optional offending field, and a
     * human-readable message.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ApiError(String code, String field, String message) {
    }
}
