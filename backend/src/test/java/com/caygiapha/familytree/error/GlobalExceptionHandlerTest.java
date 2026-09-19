package com.caygiapha.familytree.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Unit tests for {@link GlobalExceptionHandler}: each error category maps to the HTTP status and
 * envelope declared in the design's Error Handling table, and the JSON envelope shape matches
 * {@code { "error": { code, field?, message } }} (with {@code field} omitted when absent).
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void apiExceptionMapsCodeFieldAndStatus() {
        ApiException ex = ApiException.validation("phone", "Invalid Vietnamese phone number.");

        ResponseEntity<ErrorResponse> response = handler.handleApiException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ErrorResponse.ApiError error = response.getBody().error();
        assertThat(error.code()).isEqualTo("VALIDATION_ERROR");
        assertThat(error.field()).isEqualTo("phone");
        assertThat(error.message()).isEqualTo("Invalid Vietnamese phone number.");
    }

    @Test
    void everyErrorCodeMapsToItsTableStatus() {
        assertThat(statusOf(ErrorCode.IDENTIFIER_TAKEN)).isEqualTo(HttpStatus.CONFLICT);
        assertThat(statusOf(ErrorCode.ACCOUNT_NOT_FOUND)).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(statusOf(ErrorCode.CODE_INVALID)).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(statusOf(ErrorCode.CODE_EXPIRED)).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(statusOf(ErrorCode.TOO_MANY_ATTEMPTS)).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(statusOf(ErrorCode.NOT_AUTHORIZED)).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(statusOf(ErrorCode.NODE_NOT_ACCESSIBLE)).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(statusOf(ErrorCode.MISSING_NODE)).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(statusOf(ErrorCode.SELF_REFERENCE)).isEqualTo(HttpStatus.CONFLICT);
        assertThat(statusOf(ErrorCode.CYCLE_VIOLATION)).isEqualTo(HttpStatus.CONFLICT);
        assertThat(statusOf(ErrorCode.PARENT_LIMIT)).isEqualTo(HttpStatus.CONFLICT);
        assertThat(statusOf(ErrorCode.ALREADY_CLAIMED)).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void methodArgumentNotValidBecomesBadRequestNamingFirstField() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors())
                .thenReturn(List.of(new FieldError("request", "displayName", "must not be blank")));

        ResponseEntity<ErrorResponse> response = handler.handleMethodArgumentNotValid(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error().code()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().error().field()).isEqualTo("displayName");
        assertThat(response.getBody().error().message()).isEqualTo("must not be blank");
    }

    @Test
    void constraintViolationBecomesBadRequestUsingLeafProperty() {
        ConstraintViolation<?> violation = mock(ConstraintViolation.class);
        Path path = mock(Path.class);
        when(path.toString()).thenReturn("search.nameQuery");
        when(violation.getPropertyPath()).thenReturn(path);
        when(violation.getMessage()).thenReturn("size must be between 1 and 100");
        ConstraintViolationException ex = new ConstraintViolationException(Set.of(violation));

        ResponseEntity<ErrorResponse> response = handler.handleConstraintViolation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error().field()).isEqualTo("nameQuery");
        assertThat(response.getBody().error().message()).isEqualTo("size must be between 1 and 100");
    }

    @Test
    void unexpectedExceptionBecomesInternalErrorWithoutLeakingDetail() {
        ResponseEntity<ErrorResponse> response =
                handler.handleUnexpected(new IllegalStateException("boom: secret detail"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().error().code()).isEqualTo("INTERNAL_ERROR");
        assertThat(response.getBody().error().field()).isNull();
        assertThat(response.getBody().error().message()).doesNotContain("secret detail");
    }

    @Test
    void missingRequestParameterBecomesBadRequestNamingTheParameter() {
        MissingServletRequestParameterException ex =
                new MissingServletRequestParameterException("treeId", "UUID");

        ResponseEntity<ErrorResponse> response = handler.handleMissingParam(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error().code()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().error().field()).isEqualTo("treeId");
    }

    @Test
    void typeMismatchedParameterBecomesBadRequestNamingTheParameter() {
        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                "not-a-uuid", java.util.UUID.class, "treeId", null, new IllegalArgumentException());

        ResponseEntity<ErrorResponse> response = handler.handleTypeMismatch(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error().code()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().error().field()).isEqualTo("treeId");
    }

    @Test
    void unreadableBodyBecomesBadRequest() {
        HttpMessageNotReadableException ex =
                new HttpMessageNotReadableException("malformed", (org.springframework.http.HttpInputMessage) null);

        ResponseEntity<ErrorResponse> response = handler.handleUnreadableBody(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error().code()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void envelopeSerializesWithFieldWhenPresent() throws Exception {
        String json = mapper.writeValueAsString(
                ErrorResponse.of(ErrorCode.VALIDATION_ERROR, "phone", "Invalid phone."));

        assertThat(json).contains("\"error\":{\"code\":\"VALIDATION_ERROR\",\"field\":\"phone\",\"message\":\"Invalid phone.\"}");
        assertThat(json).contains("\"type\":\"https://docs.caygiapha.dev/problems/VALIDATION_ERROR\"");
        assertThat(json).contains("\"status\":400");
    }

    @Test
    void envelopeOmitsFieldWhenNull() throws Exception {
        String json = mapper.writeValueAsString(
                ErrorResponse.of(ErrorCode.NOT_AUTHORIZED, null, "Not allowed."));

        assertThat(json).doesNotContain("\"field\"");
        assertThat(json).contains("\"error\":{\"code\":\"NOT_AUTHORIZED\",\"message\":\"Not allowed.\"}");
        assertThat(json).contains("\"status\":403");
    }

    private HttpStatus statusOf(ErrorCode code) {
        return (HttpStatus) handler
                .handleApiException(new ApiException(code, "msg"))
                .getStatusCode();
    }
}
