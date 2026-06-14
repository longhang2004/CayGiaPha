package com.caygiapha.familytree.service;

/**
 * Outbound one-time-code delivery seam (Requirements 1.3, 2.1, 11.1).
 *
 * <p>This is the system's only outbound integration for authentication. It is intentionally an
 * interface so that a real SMS/email provider can be plugged in later and so that tests can supply
 * an in-memory fake that captures the delivered plaintext code. <em>No real provider is wired by
 * this task</em>; {@link LoggingOtpDeliveryProvider} is the default development stub.
 *
 * <p>Implementations receive the plaintext code (the only place it is ever exposed); the
 * {@code Verification_Service} stores only a hash of it.
 */
public interface OtpDeliveryProvider {

    /**
     * Deliver a one-time code to a destination.
     *
     * @param destination the phone number or email address the code is sent to
     * @param code        the plaintext 6-digit code (never persisted in plaintext)
     * @param purpose     why the code is being sent (sign-up, sign-in, or claim)
     * @throws OtpDeliveryException if delivery fails; the caller's transaction rolls back so no
     *     half-issued code is persisted
     */
    void deliver(String destination, String code, VerificationPurpose purpose);

    /**
     * Thrown when an OTP could not be delivered (provider down / timeout). Treated as a retryable
     * failure by the caller; because code issuance is transactional, a delivery failure persists no
     * code row.
     */
    class OtpDeliveryException extends RuntimeException {
        public OtpDeliveryException(String message, Throwable cause) {
            super(message, cause);
        }

        public OtpDeliveryException(String message) {
            super(message);
        }
    }
}
