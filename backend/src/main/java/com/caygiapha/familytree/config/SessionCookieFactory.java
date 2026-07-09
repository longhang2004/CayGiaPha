package com.caygiapha.familytree.config;

import com.caygiapha.familytree.service.SessionService;
import java.util.Optional;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Builds and reads the authenticated session cookie (Requirements 2.3, 2.8).
 *
 * <p>The cookie carries a high-entropy opaque token (not the DB primary key). Attributes:
 * HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=30 days.
 */
@Component
public class SessionCookieFactory {

    public static final String COOKIE_NAME = "SESSION";

    public ResponseCookie create(String rawToken) {
        return baseBuilder(rawToken == null ? "" : rawToken)
                .maxAge(SessionService.SESSION_DURATION)
                .build();
    }

    public ResponseCookie clear() {
        return baseBuilder("").maxAge(0).build();
    }

    /** Return the raw cookie value when present (opaque token; not necessarily a UUID). */
    public Optional<String> parseToken(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return Optional.empty();
        }
        return Optional.of(rawValue.trim());
    }

    private ResponseCookie.ResponseCookieBuilder baseBuilder(String value) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/");
    }
}
