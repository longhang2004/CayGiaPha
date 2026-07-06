package com.caygiapha.familytree.service;

import com.caygiapha.familytree.error.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * A small in-memory fixed-window rate limiter used to throttle verification-code requests per
 * identifier and per source address (Requirement 25.1). Over-threshold requests are rejected with
 * {@code TOO_MANY_ATTEMPTS} (HTTP 429) and a generic message that does not reveal whether the
 * identifier exists.
 *
 * <p>Keys are opaque strings (e.g. {@code "signup:<identifier>"} or {@code "ip:<addr>"}). The
 * limiter uses Redis when {@code REDIS_URL} is configured; otherwise it falls back to in-memory state
 * for local development.
 */
@Component
public class RateLimiter {

    private record Window(Instant start, int count) {}

    private final Clock clock;
    private final int maxRequests;
    private final Duration window;
    private final StringRedisTemplate redisTemplate;
    private final boolean redisEnabled;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Autowired
    public RateLimiter(
            Clock clock,
            @Value("${app.ratelimit.max-requests:5}") int maxRequests,
            @Value("${app.ratelimit.window-seconds:600}") long windowSeconds,
            @Value("${REDIS_URL:${spring.data.redis.url:}}") String redisUrl,
            ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.clock = clock;
        this.maxRequests = maxRequests;
        this.window = Duration.ofSeconds(windowSeconds);
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
        this.redisEnabled = redisUrl != null && !redisUrl.isBlank() && this.redisTemplate != null;
    }

    public RateLimiter(Clock clock, int maxRequests, long windowSeconds) {
        this.clock = clock;
        this.maxRequests = maxRequests;
        this.window = Duration.ofSeconds(windowSeconds);
        this.redisTemplate = null;
        this.redisEnabled = false;
    }

    /**
     * Count one request against {@code key}; reject with {@code TOO_MANY_ATTEMPTS} when the key has
     * exceeded {@code maxRequests} within the current window. A {@code null}/blank key is ignored.
     */
    public void check(String key) {
        check(key, maxRequests);
    }

    /**
     * Count one request against {@code key} with an endpoint-specific limit. The shared default
     * window still applies, so production can raise limits for low-risk UX flows without changing
     * more sensitive request classes.
     */
    public void check(String key, int maxRequestsForKey) {
        if (key == null || key.isBlank()) {
            return;
        }
        if (redisEnabled && checkRedis(key, maxRequestsForKey)) {
            return;
        }
        checkMemory(key, maxRequestsForKey);
    }

    private boolean checkRedis(String key, int maxRequestsForKey) {
        try {
            String redisKey = "caygiapha:rate-limit:" + key;
            Long count = redisTemplate.opsForValue().increment(redisKey);
            if (count != null && count == 1L) {
                redisTemplate.expire(redisKey, window.toSeconds(), TimeUnit.SECONDS);
            }
            if (count != null && count > maxRequestsForKey) {
                throw ApiException.tooManyAttempts(
                        "Too many requests. Please wait a while and try again.");
            }
            return true;
        } catch (ApiException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private void checkMemory(String key, int maxRequestsForKey) {
        Instant now = clock.instant();
        Window updated = windows.compute(key, (k, existing) -> {
            if (existing == null || Duration.between(existing.start(), now).compareTo(window) >= 0) {
                return new Window(now, 1);
            }
            return new Window(existing.start(), existing.count() + 1);
        });
        if (updated.count() > maxRequestsForKey) {
            throw ApiException.tooManyAttempts(
                    "Too many requests. Please wait a while and try again.");
        }
    }
}
