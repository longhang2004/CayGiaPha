package com.caygiapha.familytree.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provides the application {@link Clock} as an injectable bean.
 *
 * <p>Domain services that depend on the current time (notably the {@code Verification_Service},
 * which enforces validity windows and lockouts) inject this {@link Clock} rather than calling
 * {@link java.time.Instant#now()} directly. This makes time-dependent behavior deterministic and
 * lets property-based tests (Properties 1 and 2) drive issue/check times with a fixed or stepped
 * clock.
 */
@Configuration
public class TimeConfig {

    /** The default wall-clock used in production; overridable in tests with a fixed clock. */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
