package com.caygiapha.familytree.dto;

/**
 * Request body for {@code POST /api/v1/auth/signin/verify} (Requirements 2.2, 2.3, 2.5, 2.6).
 *
 * <p>The user resubmits the {@code identifier} they requested a sign-in code for together with the
 * 6-digit {@code code} they received; on success the {@code Auth_Service} establishes a 30-day
 * session. A wrong or expired code is rejected and leaves any existing session unchanged (2.5, 2.6).
 *
 * @param identifier the phone number or email the sign-in code was requested for
 * @param code       the 6-digit verification code received
 */
public record SignInVerifyRequest(String identifier, String code) {
}
