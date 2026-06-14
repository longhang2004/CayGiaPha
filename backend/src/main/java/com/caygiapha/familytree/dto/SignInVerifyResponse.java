package com.caygiapha.familytree.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Response body for {@code POST /api/v1/auth/signin/verify} (Requirement 2.3).
 *
 * <p>Confirms that an authenticated 30-day session was established. The opaque session token is
 * <em>not</em> included here — it is delivered only in the {@code HttpOnly} session cookie so it is
 * never exposed to client-side script. This body carries the authenticated user's id and the
 * session's expiry for the client's convenience.
 *
 * @param userId    id of the now-signed-in account
 * @param expiresAt the session's expiry deadline ({@code now + 30 days})
 */
public record SignInVerifyResponse(UUID userId, Instant expiresAt) {
}
