package com.caygiapha.familytree.service;

import com.caygiapha.familytree.dto.SignInResponse;
import com.caygiapha.familytree.dto.SignUpResponse;
import com.caygiapha.familytree.dto.SignUpVerifyResponse;
import com.caygiapha.familytree.entity.Session;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Auth_Service orchestration for sign-up, sign-in, session lifecycle, and verification-triggered
 * single-tree creation (Requirements 1.5, 1.6, 1.9, 2.1, 2.3, 2.4, 2.5, 2.8, 9.2, 13.1, 13.2,
 * 13.3).
 *
 * <p>This service composes the reusable primitives — {@link IdentifierValidator},
 * {@link DuplicateIdentifierChecker}, and {@link VerificationCodeService} — into the two sign-up
 * endpoints:
 *
 * <h2>Sign-up ({@link #signUp})</h2>
 * <ol>
 *   <li>Validate/classify the identifier, naming the offending field on rejection (1.1, 1.2, 1.7).</li>
 *   <li>Run the duplicate-identifier check with a 5-second budget (1.6, 1.9):
 *     <ul>
 *       <li>already registered → reject with {@code IDENTIFIER_TAKEN} (1.6);</li>
 *       <li>free, or the check could not conclude within the budget → create the account as
 *           <em>unverified</em> (1.5, 1.9).</li>
 *     </ul>
 *   </li>
 *   <li>Issue and deliver a sign-up verification code (1.3) via {@link VerificationCodeService}.</li>
 * </ol>
 *
 * <h2>Verify ({@link #verifySignUp})</h2>
 * <ol>
 *   <li>Resolve the account from the submitted identifier.</li>
 *   <li>Verify the submitted code (validity window / lockout enforced by the
 *       {@link VerificationCodeService}; 1.4, 1.8).</li>
 *   <li>Mark the account verified and create exactly one tree with the default region (13.1, 9.2),
 *       returning the existing tree if one already exists (the one-tree-per-user guard; 13.2).</li>
 * </ol>
 *
 * <p>Both methods are {@link Mutation}s, so any failure — including a failure during tree creation —
 * rolls the whole unit of work back, leaving the user without a tree and surfacing an error (13.3),
 * and leaving nothing persisted when sign-up is rejected (1.6).
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final TreeRepository treeRepository;
    private final IdentifierValidator identifierValidator;
    private final DuplicateIdentifierChecker duplicateIdentifierChecker;
    private final VerificationCodeService verificationCodeService;
    private final SessionService sessionService;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final ConsentService consentService;

    public AuthService(
            UserRepository userRepository,
            TreeRepository treeRepository,
            IdentifierValidator identifierValidator,
            DuplicateIdentifierChecker duplicateIdentifierChecker,
            VerificationCodeService verificationCodeService,
            SessionService sessionService,
            GoogleIdTokenVerifier googleIdTokenVerifier,
            ConsentService consentService) {
        this.userRepository = userRepository;
        this.treeRepository = treeRepository;
        this.identifierValidator = identifierValidator;
        this.duplicateIdentifierChecker = duplicateIdentifierChecker;
        this.verificationCodeService = verificationCodeService;
        this.sessionService = sessionService;
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.consentService = consentService;
    }

    /**
     * Create an unverified account for the given identifier and trigger a sign-up verification code
     * (Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.9).
     *
     * @param identifier a Vietnamese phone number or an email address
     * @return the created account id and its (always {@code false}) verification state
     * @throws ApiException {@code VALIDATION_ERROR} for an invalid identifier (1.7), or
     *     {@code IDENTIFIER_TAKEN} when the identifier is already registered (1.6)
     */
    @Mutation
    public SignUpResponse signUp(String identifier) {
        IdentifierType type = identifierValidator.requireValid("identifier", identifier);

        DuplicateIdentifierChecker.Result result =
                duplicateIdentifierChecker.check(type, identifier);
        if (result == DuplicateIdentifierChecker.Result.TAKEN) {
            // 1.6 — reject; the @Mutation transaction guarantees nothing is persisted.
            throw ApiException.identifierTaken(
                    "identifier", "This phone number or email is already registered.");
        }
        // AVAILABLE, or UNDETERMINED (the 1.9 timeout fallback): create as unverified (1.5).

        User user = type == IdentifierType.PHONE
                ? User.withPhone(identifier)
                : User.withEmail(identifier);
        User saved = userRepository.save(user);

        // 1.3 — issue and deliver the sign-up verification code.
        verificationCodeService.issueForAccount(VerificationPurpose.SIGNUP, saved.getId(), identifier);

        return new SignUpResponse(saved.getId(), saved.isVerified());
    }

    /**
     * Verify a sign-up code and, on success, mark the account verified and create its single tree
     * (Requirements 1.4, 1.8, 9.2, 13.1, 13.2, 13.3).
     *
     * @param identifier the identifier the account was created with
     * @param code        the submitted 6-digit code
     * @return the verified account id, its tree id, and the tree's region
     * @throws ApiException {@code ACCOUNT_NOT_FOUND} when no account matches the identifier;
     *     {@code CODE_INVALID}/{@code CODE_EXPIRED}/{@code TOO_MANY_ATTEMPTS} from verification
     */
    @Mutation
    public SignUpVerifyResponse verifySignUp(String identifier, String code) {
        return verifySignUp(identifier, code, null);
    }

    /**
     * Verify a sign-up code and, on success, mark the account verified and create its single tree
     * with the owner's chosen region (Requirements 1.4, 1.8, 9.2, 9.6, 13.1, 13.2, 13.3).
     *
     * @param identifier the identifier the account was created with
     * @param code        the submitted 6-digit code
     * @param region      the chosen region key ({@code Bac}/{@code Trung}/{@code Nam}); when
     *                    {@code null}/blank the default region (Bắc) is used (9.2)
     * @return the verified account id, its tree id, and the tree's region
     * @throws ApiException {@code ACCOUNT_NOT_FOUND} when no account matches the identifier;
     *     {@code VALIDATION_ERROR} naming {@code region} when a non-blank region is not one of
     *     Bắc/Trung/Nam (9.6); {@code CODE_INVALID}/{@code CODE_EXPIRED}/{@code TOO_MANY_ATTEMPTS}
     *     from verification
     */
    @Mutation
    public SignUpVerifyResponse verifySignUp(String identifier, String code, String region) {
        String resolvedRegion = resolveRegion(region);

        IdentifierType type = identifierValidator.requireValid("identifier", identifier);
        User user = findByIdentifier(type, identifier)
                .orElseThrow(() -> ApiException.accountNotFound(
                        "No account was found for the provided identifier."));

        // 1.4 / 1.8 — validity window + lockout enforced by the verification primitive.
        verificationCodeService.verifyForAccount(VerificationPurpose.SIGNUP, user.getId(), code);

        // 1.5 -> verified.
        user.setVerified(true);
        userRepository.save(user);

        // 13.1 / 13.2 / 9.2 — create exactly one tree with the chosen region; reuse any existing.
        Tree tree = createSingleTree(user.getId(), resolvedRegion);

        return new SignUpVerifyResponse(user.getId(), tree.getId(), tree.getRegion());
    }

    /**
     * Resolve the requested region to a valid stored value: the default (Bắc) when {@code null} or
     * blank (9.2), otherwise the value itself — rejected with a field-level error when it is not one
     * of {@code Bac}/{@code Trung}/{@code Nam} (9.6).
     */
    private String resolveRegion(String region) {
        if (region == null || region.isBlank()) {
            return Tree.DEFAULT_REGION;
        }
        if (!Tree.isValidRegion(region)) {
            throw ApiException.validation("region", "Region must be one of Bac, Trung, or Nam.");
        }
        return region;
    }

    /**
     * Request a sign-in code for a verified account (Requirements 2.1, 2.4).
     *
     * <p>A code is issued <em>only</em> when the identifier matches an existing, verified account.
     * A non-existent account, or an account that has not completed verification, is rejected with
     * {@code ACCOUNT_NOT_FOUND} (2.4) and no code is issued.
     *
     * @param identifier the phone number or email to sign in with
     * @return the verified account id a sign-in code was delivered to
     * @throws ApiException {@code VALIDATION_ERROR} for an invalid identifier;
     *     {@code ACCOUNT_NOT_FOUND} when no verified account matches (2.4)
     */
    @Mutation
    public SignInResponse signIn(String identifier) {
        IdentifierType type = identifierValidator.requireValid("identifier", identifier);
        User user = findByIdentifier(type, identifier)
                .filter(User::isVerified)
                .orElseThrow(() -> ApiException.accountNotFound(
                        "No verified account was found for the provided identifier."));

        // 2.1 — deliver a sign-in code (300s validity) for the verified account.
        verificationCodeService.issueForAccount(VerificationPurpose.SIGNIN, user.getId(), identifier);

        return new SignInResponse(user.getId());
    }

    /**
     * Verify a sign-in code and, on success, establish a 30-day session
     * (Requirements 2.2, 2.3, 2.5, 2.6).
     *
     * <p>The code is checked by {@link VerificationCodeService#verifyForAccount} (validity window
     * and lockout enforced there). A wrong or expired code throws before any session is created, so
     * any existing session is left unchanged (2.5, 2.6). On success a new {@link Session} valid for
     * 30 days is created (2.3); the caller (controller) places its opaque id in the session cookie.
     *
     * @param identifier the identifier the sign-in code was requested for
     * @param code        the submitted 6-digit code
     * @return the established session
     * @throws ApiException {@code ACCOUNT_NOT_FOUND} when no verified account matches;
     *     {@code CODE_INVALID}/{@code CODE_EXPIRED}/{@code TOO_MANY_ATTEMPTS} from verification (the
     *     existing session, if any, is left unchanged — 2.5)
     */
    @Mutation
    public Session verifySignIn(String identifier, String code) {
        IdentifierType type = identifierValidator.requireValid("identifier", identifier);
        User user = findByIdentifier(type, identifier)
                .filter(User::isVerified)
                .orElseThrow(() -> ApiException.accountNotFound(
                        "No verified account was found for the provided identifier."));

        // 2.2 / 2.6 — validity window + lockout enforced by the verification primitive. A wrong or
        // expired code throws here, before any session is created, leaving existing sessions intact.
        verificationCodeService.verifyForAccount(VerificationPurpose.SIGNIN, user.getId(), code);

        // 2.3 — establish a 30-day server-side session.
        return sessionService.create(user.getId());
    }

    /**
     * Verify a Google ID token and establish a session.
     * If the account doesn't exist, create it (requiring consents).
     */
    @Mutation
    public Session verifyGoogleAuth(String idTokenString, String region, boolean acceptedTos, boolean acceptedPrivacy) {
        try {
            GoogleIdToken idToken = googleIdTokenVerifier.verify(idTokenString);
            if (idToken == null) {
                throw ApiException.validation("idToken", "Invalid ID token.");
            }
            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            if (email == null) {
                throw ApiException.validation("idToken", "ID token does not contain an email.");
            }

            java.util.Optional<User> optionalUser = findByIdentifier(IdentifierType.EMAIL, email);
            if (optionalUser.isPresent()) {
                User user = optionalUser.get();
                if (!user.isVerified()) {
                    user.setVerified(true);
                    userRepository.save(user);
                }
                return sessionService.create(user.getId());
            } else {
                // New user via Google Auth
                consentService.requireConsent(acceptedTos, acceptedPrivacy);

                User user = User.withEmail(email);
                user.setVerified(true);
                User saved = userRepository.save(user);

                consentService.recordConsent(saved.getId());

                return sessionService.create(saved.getId());
            }
        } catch (Exception e) {
            throw ApiException.validation("idToken", "Failed to verify ID token: " + e.getMessage());
        }
    }

    /**
     * Terminate and invalidate the current session on sign-out (Requirement 2.8).
     *
     * <p>Delegates to {@link SessionService#revoke}; revocation is idempotent, so an absent or
     * already-revoked token is a harmless no-op.
     *
     * @param sessionToken the session token id from the cookie (may be {@code null})
     */
    @Mutation
    public void signOut(UUID sessionToken) {
        sessionService.revoke(sessionToken);
    }

    /**
     * Create the user's single tree, or return the existing one if the user already owns a tree
     * (Requirements 13.1, 13.2). The UNIQUE constraint on {@code owner_user_id} backs this; the
     * read-then-create guard keeps the common path from relying on a constraint violation.
     *
     * <p>If creation fails (e.g. a constraint or persistence error), the exception propagates and
     * the enclosing {@link Mutation} transaction rolls back, leaving the user without a tree (13.3).
     */
    private Tree createSingleTree(UUID ownerUserId, String region) {
        return treeRepository
                .findByOwnerUserId(ownerUserId)
                .orElseGet(() -> treeRepository.save(new Tree(ownerUserId, region)));
    }

    private java.util.Optional<User> findByIdentifier(IdentifierType type, String identifier) {
        return type == IdentifierType.PHONE
                ? userRepository.findByPhone(identifier)
                : userRepository.findByEmail(identifier);
    }
}
