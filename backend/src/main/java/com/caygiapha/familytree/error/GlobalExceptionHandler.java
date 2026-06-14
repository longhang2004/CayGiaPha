package com.caygiapha.familytree.error;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Translates exceptions thrown anywhere in the web/service layers into the single JSON error
 * envelope ({@link ErrorResponse}) with the HTTP status declared on the corresponding
 * {@link ErrorCode}, per the design's Error Handling table.
 *
 * <p>Bean-validation failures on request bodies/params are normalized to {@code VALIDATION_ERROR}
 * (HTTP 400) with the offending field named, satisfying the "identify the invalid field" criteria
 * (1.7, 3.6, 4.2, 6.2, 9.6, 12.2, 16.8). Any unanticipated exception becomes a generic
 * {@code INTERNAL_ERROR} (HTTP 500) without leaking internal details to the client.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Maps a domain {@link ApiException} to its declared status and envelope.
     */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex) {
        ErrorResponse body = ErrorResponse.of(ex.code(), ex.field(), ex.getMessage());
        return ResponseEntity.status(ex.code().status()).body(body);
    }

    /**
     * Maps {@code @Valid} request-body failures to a 400 {@code VALIDATION_ERROR}, naming the
     * first offending field.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        FieldError fieldError = ex.getBindingResult().getFieldErrors().stream().findFirst().orElse(null);
        String field = fieldError != null ? fieldError.getField() : null;
        String message = fieldError != null && fieldError.getDefaultMessage() != null
                ? fieldError.getDefaultMessage()
                : "Request validation failed.";
        return validationResponse(field, message);
    }

    /**
     * Maps validated query/path parameter failures ({@code @Validated} on the controller) to a
     * 400 {@code VALIDATION_ERROR}, naming the first offending property.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        ConstraintViolation<?> violation =
                ex.getConstraintViolations().stream().findFirst().orElse(null);
        String field = null;
        String message = "Request validation failed.";
        if (violation != null) {
            field = lastPathNode(violation.getPropertyPath().toString());
            message = violation.getMessage();
        }
        return validationResponse(field, message);
    }

    /**
     * Maps a missing required request parameter (e.g. {@code ?treeId=}) to a 400
     * {@code VALIDATION_ERROR} naming the parameter, rather than letting it fall through to a 500.
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException ex) {
        return validationResponse(ex.getParameterName(),
                "Required request parameter '" + ex.getParameterName() + "' is missing.");
    }

    /**
     * Maps a request parameter / path variable of the wrong type (e.g. a non-UUID {@code treeId})
     * to a 400 {@code VALIDATION_ERROR} naming the offending parameter.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return validationResponse(ex.getName(),
                "Request parameter '" + ex.getName() + "' has an invalid value.");
    }

    /**
     * Maps a missing or malformed request body (unreadable JSON) to a 400 {@code VALIDATION_ERROR}.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return validationResponse(null, "Request body is missing or malformed.");
    }

    /**
     * Catch-all so an unexpected failure still returns the standard envelope (500) rather than a
     * stack trace. The cause is logged server-side only.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception mapped to INTERNAL_ERROR", ex);
        ErrorResponse body = ErrorResponse.of(ErrorCode.INTERNAL_ERROR, null,
                "An unexpected error occurred.");
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.status()).body(body);
    }

    private ResponseEntity<ErrorResponse> validationResponse(String field, String message) {
        ErrorResponse body = ErrorResponse.of(ErrorCode.VALIDATION_ERROR, field, message);
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.status()).body(body);
    }

    /**
     * Extracts the leaf property name from a bean-validation property path such as
     * {@code create.request.phone} -> {@code phone}.
     */
    private static String lastPathNode(String propertyPath) {
        if (propertyPath == null || propertyPath.isEmpty()) {
            return null;
        }
        int idx = propertyPath.lastIndexOf('.');
        return idx >= 0 ? propertyPath.substring(idx + 1) : propertyPath;
    }
}
