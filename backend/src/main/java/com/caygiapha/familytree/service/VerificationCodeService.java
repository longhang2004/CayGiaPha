package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.VerificationCode;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.VerificationCodeRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Verification_Service code lifecycle primitives: issuing one-time codes and verifying submissions
 * with validity windows, single-use semantics, and the 5-attempt lockout
 * (Requirements 1.3, 1.4, 1.8, 2.2, 2.6, 2.7, 11.4, 11.5).
 *
 * <p>This service deliberately provides reusable primitives — {@link #issue} and {@link #verify} —
 * that the sign-up/sign-in/claim orchestration endpoints (Tasks 6.5, 6.7, 6.8) compose; it does not
 * itself create users, sessions, or claims.
 *
 * <h2>Validity window (Property 1)</h2>
 * A code is accepted <em>iff</em> the submitted plaintext matches, the check time is within the
 * code's validity window ({@code issued_at}..{@code expires_at}; 300s for sign-up/sign-in, 900s for
 * claim), and the code has not been consumed.
 *
 * <h2>Lockout (Property 2)</h2>
 * After {@value #MAX_ATTEMPTS} non-matching submissions the issued code is invalidated and further
 * submissions are rejected. The reaction differs by purpose:
 * <ul>
 *   <li><strong>sign-up</strong>: the account is locked for {@value #LOCKOUT_SECONDS} seconds; the
 *       code's {@code expires_at} is set to the lockout deadline. While locked, submissions are
 *       rejected as {@code TOO_MANY_ATTEMPTS}; once the window passes the code is treated as
 *       expired and a new code must be issued. (1.8)</li>
 *   <li><strong>sign-in / claim</strong>: the issued code is invalidated (marked consumed) so no
 *       submission can ever succeed again. (2.7, 11.5)</li>
 * </ul>
 *
 * <p>Time is taken from an injected {@link Clock} so validity-window and lockout behavior is
 * deterministic under test.
 */
@Service
public class VerificationCodeService {

    /** Failed-submission limit before the issued code is locked / invalidated. */
    public static final int MAX_ATTEMPTS = 5;

    /** Sign-up account lockout window, in seconds, applied once the attempt limit is reached. */
    public static final long LOCKOUT_SECONDS = 900;

    private static final Duration LOCKOUT_WINDOW = Duration.ofSeconds(LOCKOUT_SECONDS);

    private final VerificationCodeRepository repository;
    private final VerificationCodeGenerator generator;
    private final VerificationCodeHasher hasher;
    private final OtpDeliveryProvider deliveryProvider;
    private final Clock clock;

    public VerificationCodeService(
            VerificationCodeRepository repository,
            VerificationCodeGenerator generator,
            VerificationCodeHasher hasher,
            OtpDeliveryProvider deliveryProvider,
            Clock clock) {
        this.repository = repository;
        this.generator = generator;
        this.hasher = hasher;
        this.deliveryProvider = deliveryProvider;
        this.clock = clock;
    }

    /**
     * Issue a fresh code for an account-scoped purpose (sign-up or sign-in) and deliver it.
     *
     * @param purpose     {@link VerificationPurpose#SIGNUP} or {@link VerificationPurpose#SIGNIN}
     * @param userId      the account the code is bound to
     * @param destination the phone/email the code is delivered to
     * @return the persisted {@link VerificationCode} (its plaintext is not retained)
     */
    @Mutation
    public VerificationCode issueForAccount(
            VerificationPurpose purpose, UUID userId, String destination) {
        if (!purpose.isAccountScoped()) {
            throw new IllegalArgumentException(
                    "Purpose " + purpose + " is not account-scoped; use issueForNode.");
        }
        return issue(purpose, userId, null, destination);
    }

    /**
     * Issue a fresh claim code bound to a person node and deliver it.
     *
     * @param personId    the node being claimed
     * @param destination the phone/email the invitation code is delivered to
     * @return the persisted {@link VerificationCode}
     */
    @Mutation
    public VerificationCode issueForNode(UUID personId, String destination) {
        return issue(VerificationPurpose.CLAIM, null, personId, destination);
    }

    /**
     * Issue a fresh code, invalidating any prior unconsumed code for the same target so there is a
     * single active code per (purpose, target), then deliver the plaintext via the OTP provider.
     *
     * <p>Issuance is transactional: if delivery fails the row is rolled back, so no half-issued code
     * is persisted (design Security Considerations).
     */
    @Mutation
    public VerificationCode issue(
            VerificationPurpose purpose, UUID userId, UUID personId, String destination) {
        if (purpose.isAccountScoped() && userId == null) {
            throw new IllegalArgumentException("Account-scoped code requires a userId.");
        }
        if (purpose == VerificationPurpose.CLAIM && personId == null) {
            throw new IllegalArgumentException("Claim code requires a personId.");
        }
        if (destination == null || destination.isBlank()) {
            throw new IllegalArgumentException("Destination is required.");
        }

        invalidateActiveCodes(purpose, userId, personId);

        Instant now = clock.instant();
        String plaintext = generator.generate();
        VerificationCode code = new VerificationCode(
                purpose.dbValue(),
                userId,
                personId,
                destination,
                hasher.hash(plaintext),
                now,
                now.plus(purpose.validity()));
        VerificationCode saved = repository.save(code);

        // Deliver the plaintext exactly once; never persisted in plaintext.
        deliveryProvider.deliver(destination, plaintext, purpose);
        return saved;
    }

    /**
     * Verify a submitted code for an account-scoped purpose (sign-up or sign-in).
     *
     * @throws ApiException {@code CODE_INVALID} when no active code exists or the code does not
     *     match; {@code CODE_EXPIRED} when past the validity window; {@code TOO_MANY_ATTEMPTS} when
     *     the attempt limit has been reached
     */
    @Mutation
    public void verifyForAccount(VerificationPurpose purpose, UUID userId, String submittedCode) {
        if (!purpose.isAccountScoped()) {
            throw new IllegalArgumentException(
                    "Purpose " + purpose + " is not account-scoped; use verifyForNode.");
        }
        VerificationCode code = repository
                .findFirstByPurposeAndUserIdAndConsumedFalseOrderByIssuedAtDesc(
                        purpose.dbValue(), userId)
                .orElseThrow(() -> noActiveCode());
        verify(code, submittedCode);
    }

    /**
     * Verify a submitted claim code bound to a person node.
     *
     * @throws ApiException as for {@link #verifyForAccount}
     */
    @Mutation
    public void verifyForNode(UUID personId, String submittedCode) {
        VerificationCode code = repository
                .findFirstByPurposeAndPersonIdAndConsumedFalseOrderByIssuedAtDesc(
                        VerificationPurpose.CLAIM.dbValue(), personId)
                .orElseThrow(() -> noActiveCode());
        verify(code, submittedCode);
    }

    /**
     * Apply the verification lifecycle to a specific loaded code row.
     *
     * <p>On success the code is consumed (single-use) and the method returns normally. Every failure
     * mode throws the appropriate {@link ApiException}; because the method is a {@link Mutation}, the
     * attempt-count/lockout mutations are persisted even when it throws (the throw does not undo the
     * recorded failure, only the caller's wider unit of work would roll back its own writes).
     *
     * @throws ApiException {@code TOO_MANY_ATTEMPTS}, {@code CODE_EXPIRED}, or {@code CODE_INVALID}
     */
    @Mutation
    public void verify(VerificationCode code, String submittedCode) {
        Instant now = clock.instant();
        VerificationPurpose purpose = VerificationPurpose.fromDbValue(code.getPurpose());

        // 1) Already locked by a prior run of failures.
        if (code.getAttempts() >= MAX_ATTEMPTS) {
            if (purpose.locksAccountOnLockout() && code.isExpired(now)) {
                // Sign-up lockout window has elapsed: the code is expired; require a fresh code.
                throw ApiException.codeExpired(
                        "This verification code has expired. Please request a new code.");
            }
            throw lockedOut();
        }

        // 2) Already consumed (used successfully, or invalidated by sign-in/claim lockout).
        if (code.isConsumed()) {
            throw ApiException.codeInvalid("This verification code is no longer valid.");
        }

        // 3) Past the validity window.
        if (code.isExpired(now)) {
            throw ApiException.codeExpired(
                    "This verification code has expired. Please request a new code.");
        }

        // 4) Match check.
        if (hasher.matches(submittedCode, code.getCodeHash())) {
            code.setConsumed(true); // single-use
            repository.save(code);
            return;
        }

        // 5) Non-matching submission: record the failure and apply lockout at the limit.
        int attempts = code.incrementAttempts();
        if (attempts >= MAX_ATTEMPTS) {
            applyLockout(code, purpose, now);
            repository.save(code);
            throw lockedOut();
        }
        repository.save(code);
        throw ApiException.codeInvalid("The verification code is incorrect.");
    }

    /**
     * Read-only check of whether a code would currently be accepted (matching aside): not consumed,
     * not locked, and within the validity window. Useful to callers/tests that reason about the
     * validity window (Property 1) without submitting a guess.
     */
    @Transactional(readOnly = true)
    public boolean isWithinValidityWindow(VerificationCode code) {
        Instant now = clock.instant();
        return !code.isConsumed()
                && code.getAttempts() < MAX_ATTEMPTS
                && !code.isExpired(now);
    }

    private void applyLockout(VerificationCode code, VerificationPurpose purpose, Instant now) {
        if (purpose.locksAccountOnLockout()) {
            // Sign-up: lock the account for the lockout window by moving the deadline forward.
            code.setExpiresAt(now.plus(LOCKOUT_WINDOW));
        } else {
            // Sign-in / claim: invalidate the issued code so it can never succeed again.
            code.setConsumed(true);
        }
    }

    private void invalidateActiveCodes(VerificationPurpose purpose, UUID userId, UUID personId) {
        List<VerificationCode> active = purpose.isAccountScoped()
                ? repository.findByPurposeAndUserIdAndConsumedFalse(purpose.dbValue(), userId)
                : repository.findByPurposeAndPersonIdAndConsumedFalse(purpose.dbValue(), personId);
        for (VerificationCode prior : active) {
            prior.setConsumed(true);
        }
        if (!active.isEmpty()) {
            repository.saveAll(active);
        }
    }

    private static ApiException noActiveCode() {
        return ApiException.codeInvalid(
                "No active verification code was found. Please request a new code.");
    }

    private static ApiException lockedOut() {
        return ApiException.tooManyAttempts(
                "Too many incorrect attempts. This code is locked; please request a new code.");
    }
}
