package com.caygiapha.familytree.service;

import java.time.Duration;

/**
 * The three purposes a one-time verification code can serve, each carrying its persisted
 * {@code purpose} string and its validity window (Requirements 1.4, 2.2, 2.6, 11.4).
 *
 * <ul>
 *   <li>{@link #SIGNUP} and {@link #SIGNIN} are <em>account-scoped</em> (bound to a {@code userId})
 *       with a 300-second validity window.</li>
 *   <li>{@link #CLAIM} is <em>node-scoped</em> (bound to a {@code personId}) with a 900-second
 *       (15-minute) validity window.</li>
 * </ul>
 *
 * <p>Lockout semantics after five failed attempts differ by purpose (Requirements 1.8, 2.7, 11.5):
 * a {@link #SIGNUP} failure locks the account for 900 seconds, while {@link #SIGNIN}/{@link #CLAIM}
 * simply invalidate the issued code. See {@link #locksAccountOnLockout()}.
 */
public enum VerificationPurpose {

    /** New-account verification; account-scoped; valid 300s; 900s account lockout on 5 failures. */
    SIGNUP("signup", Duration.ofSeconds(300)),

    /** Sign-in verification; account-scoped; valid 300s; issued code invalidated on 5 failures. */
    SIGNIN("signin", Duration.ofSeconds(300)),

    /** Node-claim verification; node-scoped; valid 900s; issued code invalidated on 5 failures. */
    CLAIM("claim", Duration.ofSeconds(900)),

    /** Password reset verification; account-scoped; valid 300s; issued code invalidated on 5 failures. */
    PASSWORD_RESET("password_reset", Duration.ofSeconds(300));

    private final String dbValue;
    private final Duration validity;

    VerificationPurpose(String dbValue, Duration validity) {
        this.dbValue = dbValue;
        this.validity = validity;
    }

    /** @return the value stored in the {@code verification_codes.purpose} column. */
    public String dbValue() {
        return dbValue;
    }

    /** @return how long an issued code remains valid from its issue time. */
    public Duration validity() {
        return validity;
    }

    /** @return {@code true} for account-scoped purposes (bound to a {@code userId}). */
    public boolean isAccountScoped() {
        return this == SIGNUP || this == SIGNIN || this == PASSWORD_RESET;
    }

    /**
     * @return {@code true} when reaching the failed-attempt limit should lock the whole account for
     *     a lockout window (sign-up), rather than merely invalidating the issued code (sign-in /
     *     claim).
     */
    public boolean locksAccountOnLockout() {
        return this == SIGNUP;
    }

    /**
     * Resolves a persisted {@code purpose} string back to its enum constant.
     *
     * @throws IllegalArgumentException if no purpose matches
     */
    public static VerificationPurpose fromDbValue(String value) {
        for (VerificationPurpose p : values()) {
            if (p.dbValue.equals(value)) {
                return p;
            }
        }
        throw new IllegalArgumentException("Unknown verification purpose: " + value);
    }
}
