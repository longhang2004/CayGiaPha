package com.caygiapha.familytree.error;

import org.springframework.http.HttpStatus;

/**
 * Enumerates every error category emitted by the API together with the HTTP status it maps to,
 * per the design's Error Handling table. The {@link #name()} of each constant is the {@code code}
 * value placed in the JSON error envelope (see {@link ErrorResponse}).
 *
 * <p>Note that {@code UNRESOLVED} and {@code CONFLICT} from the design table are intentionally
 * <em>not</em> represented here: they are HTTP 200 outcomes carried in normal response payloads
 * (resolver/search/upgrade results), not error responses, so they never flow through the global
 * exception handler.
 */
public enum ErrorCode {

    /** Field-level rejection; the offending field is named and no mutation occurs. */
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST),

    /** Sign-up rejected because the phone/email is already registered. */
    IDENTIFIER_TAKEN(HttpStatus.CONFLICT),

    /** Sign-in/claim against an identifier that matches no verified account. */
    ACCOUNT_NOT_FOUND(HttpStatus.UNAUTHORIZED),

    /** Submitted verification code does not match the issued code. */
    CODE_INVALID(HttpStatus.UNAUTHORIZED),

    /** Submitted verification code is past its validity window. */
    CODE_EXPIRED(HttpStatus.UNAUTHORIZED),

    /** Lockout after five failed verification attempts. */
    TOO_MANY_ATTEMPTS(HttpStatus.TOO_MANY_REQUESTS),

    /** Mutation attempted by a non-owner / non-linked user. */
    NOT_AUTHORIZED(HttpStatus.FORBIDDEN),

    /** Target node is not present/accessible in the caller's tree. */
    NODE_NOT_ACCESSIBLE(HttpStatus.NOT_FOUND),

    /** A referenced node in a relationship request was not found. */
    MISSING_NODE(HttpStatus.NOT_FOUND),

    /** Relationship source and target are the same node. */
    SELF_REFERENCE(HttpStatus.CONFLICT),

    /** Bloodline edge would introduce a parent-child cycle. */
    CYCLE_VIOLATION(HttpStatus.CONFLICT),

    /** A child already has a father/mother bloodline edge. */
    PARENT_LIMIT(HttpStatus.CONFLICT),

    /** Invitation sent for a node that is already claimed. */
    ALREADY_CLAIMED(HttpStatus.CONFLICT),

    /** A data-mutating operation requires re-accepting updated Terms/Privacy first (23.4). */
    CONSENT_REQUIRED(HttpStatus.FORBIDDEN),

    /** Catch-all for unexpected server-side failures. */
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR);

    private final HttpStatus status;

    ErrorCode(HttpStatus status) {
        this.status = status;
    }

    /**
     * @return the HTTP status this error category maps to.
     */
    public HttpStatus status() {
        return status;
    }
}
