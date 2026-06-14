package com.caygiapha.familytree.config;

import com.caygiapha.familytree.service.SessionService;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Builds and reads the authenticated session cookie, centralizing its security attributes
 * (Requirements 2.3, 2.8; design "Security Considerations — session security").
 *
 * <p>The cookie carries the opaque server-side session token (a {@link UUID}) and is configured as:
 * <ul>
 *   <li>{@code HttpOnly} — not readable by client-side script;</li>
 *   <li>{@code Secure} — only sent over HTTPS;</li>
 *   <li>{@code SameSite=Lax} — mitigates CSRF on cross-site requests;</li>
 *   <li>{@code Path=/} — sent for the whole API;</li>
 *   <li>{@code Max-Age = 30 days} — matching the server-side session lifetime (2.3).</li>
 * </ul>
 *
 * <p>Sign-out clears the cookie with a zero {@code Max-Age} (2.8). The 30-day expiry on the cookie
 * is a client-side convenience only; the authoritative expiry is enforced server-side by
 * {@link SessionService}.
 */
@Component
public class SessionCookieFactory {

    /** Name of the session cookie. */
    public static final String COOKIE_NAME = "SESSION";

    /**
     * Build the {@code Set-Cookie} value that establishes the session cookie for the given token.
     *
     * @param token the opaque session token id
     * @return a configured {@link ResponseCookie} with the secure attributes and 30-day max-age
     */
    public ResponseCookie create(UUID token) {
        return baseBuilder(token.toString())
                .maxAge(SessionService.SESSION_DURATION)
                .build();
    }

    /**
     * Build the {@code Set-Cookie} value that clears the session cookie on sign-out (2.8).
     *
     * @return a {@link ResponseCookie} with an empty value and a zero max-age
     */
    public ResponseCookie clear() {
        return baseBuilder("").maxAge(0).build();
    }

    /**
     * Parse a session token from the raw session-cookie value.
     *
     * @param rawValue the cookie value (may be {@code null}/blank/malformed)
     * @return the parsed token, or empty when absent or not a valid UUID
     */
    public Optional<UUID> parseToken(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(rawValue));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private ResponseCookie.ResponseCookieBuilder baseBuilder(String value) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/");
    }
}
