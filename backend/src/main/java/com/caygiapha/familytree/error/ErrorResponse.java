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
public record ErrorResponse(ApiError error) {

    /**
     * Build an envelope for the given code, optional field, and human-readable message.
     *
     * @param code    the error category (its name becomes the {@code code} string)
     * @param field   the offending field, or {@code null} when not field-specific
     * @param message a human-readable, displayable message
     */
    public static ErrorResponse of(ErrorCode code, String field, String message) {
        return new ErrorResponse(new ApiError(code.name(), field, message));
    }

    /**
     * The inner error object carrying the machine-readable code, optional offending field, and a
     * human-readable message.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ApiError(String code, String field, String message) {
    }
}
