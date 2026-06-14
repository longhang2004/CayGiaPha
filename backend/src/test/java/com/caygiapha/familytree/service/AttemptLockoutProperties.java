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
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.IntRange;

/**
 * Property-based test for design <strong>Property 2: Attempt lockout</strong>.
 *
 * <p>Feature: vietnamese-family-tree, Property 2
 *
 * <p>For any sequence of verification attempts against {@link VerificationCodeService}, after
 * exactly {@value VerificationCodeService#MAX_ATTEMPTS} non-matching submissions for the same
 * account/sign-in request/invitation, every subsequent submission is rejected (and the issued code
 * invalidated / locked for its lockout window). Concretely:
 *
 * <ul>
 *   <li>Each of the first four wrong submissions is rejected with {@code CODE_INVALID} and leaves
 *       the code still within its validity window.</li>
 *   <li>The fifth wrong submission is rejected with {@code TOO_MANY_ATTEMPTS} and applies lockout:
 *       sign-up moves {@code expires_at} forward to the lockout deadline (and keeps the code
 *       unconsumed); sign-in / claim invalidate the issued code (mark it consumed).</li>
 *   <li>Every later submission — including a submission of the <em>correct</em> code — is rejected
 *       and never accepted: {@code TOO_MANY_ATTEMPTS} while a sign-up account is locked, or
 *       {@code CODE_INVALID} once the sign-in / claim code has been invalidated.</li>
 * </ul>
 *
 * <p>All submissions occur at a single, fixed clock instant inside the validity window so that the
 * lockout dimension is isolated from window expiry. A real {@link VerificationCodeHasher} backs the
 * match check; the repository is a Mockito fake whose "active code" lookups mirror the
 * consumed-flag semantics of the real query (no active code is returned once the row is consumed).
 *
 * <p><strong>Validates: Requirements 1.8, 2.7, 11.5</strong>
 */
class AttemptLockoutProperties {

    private static final Instant ISSUED_AT = Instant.parse("2024-01-01T00:00:00Z");

    /**
     * Feature: vietnamese-family-tree, Property 2
     *
     * @param purpose         the verification purpose under test (sign-up / sign-in / claim)
     * @param correctCode     the six-digit code that would match (never accepted post-lockout)
     * @param checkOffsetSecs how far past issuance every submission is made; kept strictly inside
     *     both the 300s and 900s validity windows so window-expiry does not confound the lockout
     * @param postLockout     a non-empty sequence of post-lockout submissions; each entry chooses
     *     the correct code ({@code true}) or a wrong code ({@code false}) — all must be rejected
     */
    @Property(tries = 200)
    void lockoutAfterExactlyFiveWrongSubmissions(
            @ForAll("purposes") VerificationPurpose purpose,
            @ForAll("sixDigitCodes") String correctCode,
            @ForAll @IntRange(min = 0, max = 250) int checkOffsetSecs,
            @ForAll("postLockoutSubmissions") List<Boolean> postLockout) {

        // A wrong code that is guaranteed to differ from the correct one.
        String wrongCode = correctCode.equals("000000") ? "999999" : "000000";

        // Real hasher (per the task); fixed clock inside the validity window.
        VerificationCodeHasher hasher = new VerificationCodeHasher();
        Clock clock = Clock.fixed(ISSUED_AT.plusSeconds(checkOffsetSecs), ZoneOffset.UTC);

        UUID userId = UUID.randomUUID();
        UUID personId = UUID.randomUUID();
        VerificationCode code = new VerificationCode(
                purpose.dbValue(),
                purpose.isAccountScoped() ? userId : null,
                purpose == VerificationPurpose.CLAIM ? personId : null,
                "dest",
                hasher.hash(correctCode),
                ISSUED_AT,
                ISSUED_AT.plus(purpose.validity()));

        // Fresh fakes per try so no state leaks across generated cases. The "active code" lookups
        // return the row only while it is unconsumed, exactly like the ...ConsumedFalse... queries.
        VerificationCodeRepository repository = mock(VerificationCodeRepository.class);
        when(repository.findFirstByPurposeAndUserIdAndConsumedFalseOrderByIssuedAtDesc(any(), any()))
                .thenAnswer(i -> code.isConsumed() ? Optional.empty() : Optional.of(code));
        when(repository.findFirstByPurposeAndPersonIdAndConsumedFalseOrderByIssuedAtDesc(any(), any()))
                .thenAnswer(i -> code.isConsumed() ? Optional.empty() : Optional.of(code));
        when(repository.save(any(VerificationCode.class)))
                .thenAnswer(i -> i.getArgument(0));

        VerificationCodeService service = new VerificationCodeService(
                repository,
                mock(VerificationCodeGenerator.class),
                hasher,
                mock(OtpDeliveryProvider.class),
                clock);

        // Phase 1: the first four wrong submissions are CODE_INVALID and keep the code valid.
        for (int attempt = 1; attempt <= VerificationCodeService.MAX_ATTEMPTS - 1; attempt++) {
            int expectedAttempts = attempt;
            assertThatThrownBy(() -> submit(service, purpose, userId, personId, wrongCode))
                    .isInstanceOfSatisfying(ApiException.class,
                            ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CODE_INVALID));
            assertThat(code.getAttempts()).isEqualTo(expectedAttempts);
            assertThat(code.isConsumed()).isFalse();
            assertThat(service.isWithinValidityWindow(code)).isTrue();
        }

        // Phase 2: the fifth wrong submission triggers lockout (TOO_MANY_ATTEMPTS) and persists it.
        assertThatThrownBy(() -> submit(service, purpose, userId, personId, wrongCode))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.TOO_MANY_ATTEMPTS));
        assertThat(code.getAttempts()).isEqualTo(VerificationCodeService.MAX_ATTEMPTS);
        if (purpose.locksAccountOnLockout()) {
            // Sign-up: account locked; expires_at repurposed as the lockout deadline, code kept.
            assertThat(code.isConsumed()).isFalse();
            assertThat(code.getExpiresAt())
                    .isEqualTo(clock.instant().plusSeconds(VerificationCodeService.LOCKOUT_SECONDS));
        } else {
            // Sign-in / claim: the issued code is invalidated.
            assertThat(code.isConsumed()).isTrue();
        }
        // The code is no longer acceptable regardless of a matching guess.
        assertThat(service.isWithinValidityWindow(code)).isFalse();

        // Phase 3: every subsequent submission — correct OR wrong — is rejected, never accepted.
        ErrorCode expectedPostLockoutCode = purpose.locksAccountOnLockout()
                ? ErrorCode.TOO_MANY_ATTEMPTS // locked account stays locked within its window
                : ErrorCode.CODE_INVALID; // invalidated code: no active code remains
        for (Boolean useCorrect : postLockout) {
            String submitted = useCorrect ? correctCode : wrongCode;
            assertThatThrownBy(() -> submit(service, purpose, userId, personId, submitted))
                    .isInstanceOfSatisfying(ApiException.class,
                            ex -> assertThat(ex.code()).isEqualTo(expectedPostLockoutCode));
        }
    }

    /** Dispatch a submission through the purpose-appropriate verification entry point. */
    private static void submit(
            VerificationCodeService service,
            VerificationPurpose purpose,
            UUID userId,
            UUID personId,
            String submittedCode) {
        if (purpose.isAccountScoped()) {
            service.verifyForAccount(purpose, userId, submittedCode);
        } else {
            service.verifyForNode(personId, submittedCode);
        }
    }

    /** All three verification purposes exercise both lockout reactions (lock vs invalidate). */
    @Provide
    Arbitrary<VerificationPurpose> purposes() {
        return Arbitraries.of(VerificationPurpose.values());
    }

    /** Uniformly drawn six-digit, zero-padded codes (the issued-code value space). */
    @Provide
    Arbitrary<String> sixDigitCodes() {
        return Arbitraries.integers().between(0, 999_999).map(n -> String.format("%06d", n));
    }

    /** A non-empty sequence of post-lockout submissions, mixing correct (true) and wrong (false). */
    @Provide
    Arbitrary<List<Boolean>> postLockoutSubmissions() {
        return Arbitraries.of(true, false).list().ofMinSize(1).ofMaxSize(6);
    }
}
