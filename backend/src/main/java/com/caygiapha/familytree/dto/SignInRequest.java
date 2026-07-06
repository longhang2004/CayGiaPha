package com.caygiapha.familytree.dto;

/**
 * Request body for {@code POST /api/v1/auth/signin} (Requirements 2.1, 2.4).
 *
 * <p>The single {@code identifier} field carries either a Vietnamese phone number or an email
 * address. The {@code Auth_Service} issues a sign-in code only when the identifier matches a
 * <em>verified</em> account; otherwise it rejects the request with an account-not-found message
 * (2.4).
 *
 * @param identifier a Vietnamese phone number or an email address
 * @param password optional password for legacy password-based accounts; absent keeps the OTP flow
 */
public record SignInRequest(String identifier, String password) {
}
