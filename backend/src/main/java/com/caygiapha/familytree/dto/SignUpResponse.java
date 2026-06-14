package com.caygiapha.familytree.dto;

import java.util.UUID;

/**
 * Response body for {@code POST /api/v1/auth/signup} (Requirements 1.3, 1.5).
 *
 * <p>Returns the id of the newly created (unverified) account so the client can submit the
 * verification code, along with the {@code verified} flag, which is always {@code false} at this
 * stage (1.5).
 *
 * @param userId   id of the created account
 * @param verified verification state of the account (always {@code false} immediately after sign-up)
 */
public record SignUpResponse(UUID userId, boolean verified) {
}
