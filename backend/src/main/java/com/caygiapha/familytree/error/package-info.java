/**
 * API error handling: the single JSON error envelope ({@code ErrorResponse}), the error-category
 * enum with its HTTP status mapping ({@code ErrorCode}), the domain {@code ApiException} thrown by
 * services to reject requests, and the {@code GlobalExceptionHandler} ({@code @RestControllerAdvice})
 * that renders them consistently. See the design's Error Handling section.
 */
package com.caygiapha.familytree.error;
