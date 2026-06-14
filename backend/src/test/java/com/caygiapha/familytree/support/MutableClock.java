package com.caygiapha.familytree.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

/**
 * A {@link Clock} whose current instant can be set and advanced, so integration tests can exercise
 * the verification-code validity windows (Requirements 1.4, 2.2, 11.4) deterministically: issue a
 * code, advance the clock within or past the window, and observe acceptance/expiry. The services
 * read time exclusively from the injected {@link Clock}.
 */
public class MutableClock extends Clock {

    private Instant instant;
    private final ZoneId zone;

    public MutableClock(Instant initial, ZoneId zone) {
        this.instant = initial;
        this.zone = zone;
    }

    public static MutableClock at(Instant initial) {
        return new MutableClock(initial, ZoneId.of("UTC"));
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId newZone) {
        return new MutableClock(instant, newZone);
    }

    @Override
    public Instant instant() {
        return instant;
    }

    /** Set the current instant. */
    public void setInstant(Instant newInstant) {
        this.instant = newInstant;
    }

    /** Move the clock forward by the given amount and return the new instant. */
    public Instant advance(Duration amount) {
        this.instant = this.instant.plus(amount);
        return this.instant;
    }
}
