package com.caygiapha.familytree.error;

/**
 * Domain exception carrying an {@link ErrorCode}, an optional offending {@code field}, and a
 * human-readable message. Domain services throw this (via the static factories below) to reject a
 * request; the {@link GlobalExceptionHandler} translates it into the JSON error envelope and the
 * HTTP status declared on the code.
 *
 * <p>Because each error category maps to a single exception type, callers never need to choose an
 * HTTP status directly — they pick the semantically correct {@link ErrorCode}.
 */
public class ApiException extends RuntimeException {

    private final transient ErrorCode code;
    private final transient String field;

    public ApiException(ErrorCode code, String field, String message) {
        super(message);
        this.code = code;
        this.field = field;
    }

    public ApiException(ErrorCode code, String message) {
        this(code, null, message);
    }

    public ErrorCode code() {
        return code;
    }

    /**
     * @return the offending field, or {@code null} when the error is not field-specific.
     */
    public String field() {
        return field;
    }

    // ----- Static factories for the common categories (see the design Error Handling table) -----

    /** 400 - field-level validation rejection naming the offending field. */
    public static ApiException validation(String field, String message) {
        return new ApiException(ErrorCode.VALIDATION_ERROR, field, message);
    }

    /** 409 - sign-up identifier already registered. */
    public static ApiException identifierTaken(String field, String message) {
        return new ApiException(ErrorCode.IDENTIFIER_TAKEN, field, message);
    }

    /** 401 - identifier matches no verified account. */
    public static ApiException accountNotFound(String message) {
        return new ApiException(ErrorCode.ACCOUNT_NOT_FOUND, message);
    }

    /** 401 - submitted verification code does not match. */
    public static ApiException codeInvalid(String message) {
        return new ApiException(ErrorCode.CODE_INVALID, message);
    }

    /** 401 - submitted verification code is expired. */
    public static ApiException codeExpired(String message) {
        return new ApiException(ErrorCode.CODE_EXPIRED, message);
    }

    /** 429 - five failed attempts; locked out. */
    public static ApiException tooManyAttempts(String message) {
        return new ApiException(ErrorCode.TOO_MANY_ATTEMPTS, message);
    }

    /** 403 - mutation by a non-owner / non-linked user. */
    public static ApiException notAuthorized(String message) {
        return new ApiException(ErrorCode.NOT_AUTHORIZED, message);
    }

    /** 404 - target node not present/accessible in the caller's tree. */
    public static ApiException nodeNotAccessible(String message) {
        return new ApiException(ErrorCode.NODE_NOT_ACCESSIBLE, message);
    }

    /** 404 - a referenced node was not found. */
    public static ApiException missingNode(String field, String message) {
        return new ApiException(ErrorCode.MISSING_NODE, field, message);
    }

    /** 409 - relationship source and target are the same node. */
    public static ApiException selfReference(String message) {
        return new ApiException(ErrorCode.SELF_REFERENCE, message);
    }

    /** 409 - bloodline edge would create a parent-child cycle. */
    public static ApiException cycleViolation(String message) {
        return new ApiException(ErrorCode.CYCLE_VIOLATION, message);
    }

    /** 409 - child already has a father/mother bloodline edge. */
    public static ApiException parentLimit(String message) {
        return new ApiException(ErrorCode.PARENT_LIMIT, message);
    }

    /** 409 - invitation for an already-claimed node. */
    public static ApiException alreadyClaimed(String message) {
        return new ApiException(ErrorCode.ALREADY_CLAIMED, message);
    }

    /** 403 - a data-mutating operation requires re-accepting updated Terms/Privacy first (23.4). */
    public static ApiException consentRequired(String message) {
        return new ApiException(ErrorCode.CONSENT_REQUIRED, message);
    }
}
