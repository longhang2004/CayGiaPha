package com.caygiapha.familytree.platform.problem;

import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.error.ErrorResponse;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.net.URI;
import org.springframework.http.MediaType;

/**
 * RFC 7807 Problem Details wrapper. The nested {@code error} member preserves the product
 * envelope so existing clients keep working.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProblemDetails(
        URI type,
        String title,
        int status,
        String detail,
        String instance,
        ErrorResponse.ApiError error) {

    public static final MediaType MEDIA_TYPE = MediaType.parseMediaType("application/problem+json");

    public static ProblemDetails from(ErrorCode code, String field, String message, String instance) {
        ErrorResponse.ApiError error = new ErrorResponse.ApiError(code.name(), field, message);
        return new ProblemDetails(
                URI.create("https://caygiapha.dev/problems/" + code.name().toLowerCase()),
                code.name(),
                code.status().value(),
                message,
                instance,
                error);
    }
}
