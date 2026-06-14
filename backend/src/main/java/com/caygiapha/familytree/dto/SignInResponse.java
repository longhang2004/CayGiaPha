package com.caygiapha.familytree.dto;

import java.util.UUID;

/**
 * Response body for {@code POST /api/v1/auth/signin} (Requirement 2.1).
 *
 * <p>Returned only when a sign-in code was issued for a verified account, so the client can prompt
 * for and submit the 6-digit code. A non-existent or unverified identifier is rejected with an
 * account-not-found error (2.4) rather than this response.
 *
 * @param userId id of the verified account a sign-in code was sent to
 */
public record SignInResponse(UUID userId) {
}
