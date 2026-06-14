package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link RateLimiter} (Requirement 25.1): up to {@code maxRequests} per key within a
 * window, then {@code TOO_MANY_ATTEMPTS}; the window resets after it elapses; keys are independent.
 */
class RateLimiterTest {

    private static final Instant T0 = Instant.parse("2026-01-01T00:00:00Z");

    @Test
    void allowsUpToTheLimitThenRejects() {
        MutableClock clock = MutableClock.at(T0);
        RateLimiter limiter = new RateLimiter(clock, 3, 600);

        assertThatCode(() -> {
            limiter.check("k");
            limiter.check("k");
            limiter.check("k");
        }).doesNotThrowAnyException();

        assertThatThrownBy(() -> limiter.check("k"))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> org.assertj.core.api.Assertions.assertThat(ex.code())
                                .isEqualTo(ErrorCode.TOO_MANY_ATTEMPTS));
    }

    @Test
    void resetsAfterTheWindowElapses() {
        MutableClock clock = MutableClock.at(T0);
        RateLimiter limiter = new RateLimiter(clock, 2, 600);
        limiter.check("k");
        limiter.check("k");

        clock.advance(Duration.ofSeconds(601)); // window elapsed

        assertThatCode(() -> limiter.check("k")).doesNotThrowAnyException();
    }

    @Test
    void keysAreIndependent() {
        RateLimiter limiter = new RateLimiter(MutableClock.at(T0), 1, 600);
        limiter.check("a");
        assertThatCode(() -> limiter.check("b")).doesNotThrowAnyException();
        assertThatThrownBy(() -> limiter.check("a")).isInstanceOf(ApiException.class);
    }

    @Test
    void blankKeyIsIgnored() {
        RateLimiter limiter = new RateLimiter(MutableClock.at(T0), 1, 600);
        assertThatCode(() -> {
            limiter.check(null);
            limiter.check("");
            limiter.check("   ");
        }).doesNotThrowAnyException();
    }
}
