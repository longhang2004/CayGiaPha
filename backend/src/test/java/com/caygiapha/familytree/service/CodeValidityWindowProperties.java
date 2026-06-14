package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.VerificationCode;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.VerificationCodeRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.mockito.invocation.InvocationOnMock;

/**
 * Property-based test for design <b>Property 1: Code validity window</b>.
 *
 * <p>Feature: vietnamese-family-tree, Property 1
 *
 * <p>For any issue time and check time, a <em>correct (matching)</em> verification code submission
 * is accepted <strong>if and only if</strong> the check time is within the code's validity window
 * after issue ({@code [issued, issued + validity)} — 300s for sign-up/sign-in, 900s for node
 * claiming) <strong>and</strong> the code has not been consumed. Otherwise the submission is
 * rejected: {@link ErrorCode#CODE_INVALID} when the code was already consumed, or
 * {@link ErrorCode#CODE_EXPIRED} when the check time is at/after the window's end. An accepted
 * submission consumes the code (single-use).
 *
 * <p>Validates: Requirements 1.4, 2.2, 2.6, 11.4.
 *
 * <p>This property isolates the validity-window dimension: every submission carries the correct
 * plaintext against a fresh code (zero failed attempts, below the lockout limit), so the only
 * factors that decide acceptance are the check time relative to the window and the consumed flag.
 * Time is driven from an injected mutable {@link Clock}; the repository is mocked and the OTP
 * generator/delivery seams are stubbed, so this is a pure domain property with no database.
 */
class CodeValidityWindowProperties {

    /** A {@link Clock} whose instant can be moved to drive issue/check times deterministically. */
    private static final class MutableClock extends Clock {
        private Instant instant;
        private final ZoneId zone;

        MutableClock(Instant instant, ZoneId zone) {
            this.instant = instant;
            this.zone = zone;
        }

        void setInstant(Instant instant) {
            this.instant = instant;
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return new MutableClock(instant, zone);
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }

    /** Issue times spread across a wide instant range so the property does not depend on epoch. */
    @Provide
    Arbitrary<Long> issueEpochSeconds() {
        return Arbitraries.longs().between(0L, 4_000_000_000L);
    }

    /**
     * Deltas (check time minus issue time, in seconds) biased to straddle both validity boundaries
     * (300s for sign-up/sign-in, 900s for claim) as well as broad in-window and far-past values.
     */
    @Provide
    Arbitrary<Long> deltaSeconds() {
        return Arbitraries.oneOf(
                Arbitraries.longs().between(0L, 2_000L),
                Arbitraries.longs().between(295L, 305L),
                Arbitraries.longs().between(895L, 905L));
    }

    @Provide
    Arbitrary<VerificationPurpose> purposes() {
        return Arbitraries.of(VerificationPurpose.values());
    }

    @Property(tries = 500)
    void correctCodeAcceptedIffWithinWindowAndNotConsumed(
            @ForAll("purposes") VerificationPurpose purpose,
            @ForAll("issueEpochSeconds") long issueEpochSeconds,
            @ForAll("deltaSeconds") long deltaSeconds,
            @ForAll boolean consumed) {

        final String plaintext = "123456";

        // Real hasher: produces a hash the service can verify the correct plaintext against.
        VerificationCodeHasher hasher = new VerificationCodeHasher();

        VerificationCodeRepository repository = mock(VerificationCodeRepository.class);
        when(repository.save(any(VerificationCode.class)))
                .thenAnswer((InvocationOnMock i) -> i.getArgument(0));

        Instant issuedAt = Instant.ofEpochSecond(issueEpochSeconds);
        Instant checkAt = issuedAt.plusSeconds(deltaSeconds);
        long validitySeconds = purpose.validity().getSeconds();

        MutableClock clock = new MutableClock(checkAt, ZoneOffset.UTC);
        VerificationCodeService service = new VerificationCodeService(
                repository,
                mock(VerificationCodeGenerator.class),
                hasher,
                mock(OtpDeliveryProvider.class),
                clock);

        // A fresh code (attempts = 0) issued at issuedAt with the purpose's validity window.
        UUID userId = purpose.isAccountScoped() ? UUID.randomUUID() : null;
        UUID personId = purpose == VerificationPurpose.CLAIM ? UUID.randomUUID() : null;
        VerificationCode code = new VerificationCode(
                purpose.dbValue(),
                userId,
                personId,
                "destination@example.com",
                hasher.hash(plaintext),
                issuedAt,
                issuedAt.plus(purpose.validity()));
        code.setConsumed(consumed);

        // expires_at deadline is exclusive: accepted iff now < expiresAt, i.e. delta < validity.
        boolean withinWindow = deltaSeconds < validitySeconds;
        boolean expectAccepted = withinWindow && !consumed;

        if (expectAccepted) {
            service.verify(code, plaintext);
            // Accepted submissions consume the code (single-use).
            assertThat(code.isConsumed()).isTrue();
        } else {
            ErrorCode expectedCode = consumed
                    ? ErrorCode.CODE_INVALID // consumed is checked before the window
                    : ErrorCode.CODE_EXPIRED; // not consumed but past the window
            assertThatThrownBy(() -> service.verify(code, plaintext))
                    .isInstanceOfSatisfying(ApiException.class,
                            ex -> assertThat(ex.code()).isEqualTo(expectedCode));
        }

        // The window decision never records a failed attempt (the submission matched).
        assertThat(code.getAttempts()).isEqualTo(0);
    }
}
