package com.caygiapha.familytree.service;

import com.caygiapha.familytree.error.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * A small in-memory fixed-window rate limiter used to throttle verification-code requests per
 * identifier and per source address (Requirement 25.1). Over-threshold requests are rejected with
 * {@code TOO_MANY_ATTEMPTS} (HTTP 429) and a generic message that does not reveal whether the
 * identifier exists.
 *
 * <p>Keys are opaque strings (e.g. {@code "signup:<identifier>"} or {@code "ip:<addr>"}). This is a
 * single-node limiter (a {@link ConcurrentHashMap} of windows); a multi-node deployment would back
 * it with a shared store, but the {@link #check(String)} contract is unchanged.
 */
@Component
public class RateLimiter {

    private record Window(Instant start, int count) {}

    private final Clock clock;
    private final int maxRequests;
    private final Duration window;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimiter(
            Clock clock,
            @Value("${app.ratelimit.max-requests:5}") int maxRequests,
            @Value("${app.ratelimit.window-seconds:600}") long windowSeconds) {
        this.clock = clock;
        this.maxRequests = maxRequests;
        this.window = Duration.ofSeconds(windowSeconds);
    }

    /**
     * Count one request against {@code key}; reject with {@code TOO_MANY_ATTEMPTS} when the key has
     * exceeded {@code maxRequests} within the current window. A {@code null}/blank key is ignored.
     */
    public void check(String key) {
        if (key == null || key.isBlank()) {
            return;
        }
        Instant now = clock.instant();
        Window updated = windows.compute(key, (k, existing) -> {
            if (existing == null || Duration.between(existing.start(), now).compareTo(window) >= 0) {
                return new Window(now, 1);
            }
            return new Window(existing.start(), existing.count() + 1);
        });
        if (updated.count() > maxRequests) {
            throw ApiException.tooManyAttempts(
                    "Too many requests. Please wait a while and try again.");
        }
    }
}
