package com.caygiapha.familytree.dto;

/**
 * Request body for {@code POST /api/v1/auth/signup} (Requirements 1.1, 1.2, 1.6, 1.7, 1.9).
 *
 * <p>The single {@code identifier} field carries either a Vietnamese phone number or an email
 * address; the {@code Auth_Service} classifies and validates it (naming the offending field on
 * rejection) rather than requiring the client to declare the kind.
 *
 * @param identifier a Vietnamese phone number or an email address
 */
public record SignUpRequest(String identifier) {
}
