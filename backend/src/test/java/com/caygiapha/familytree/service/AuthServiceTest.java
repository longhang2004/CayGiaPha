package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.SignUpResponse;
import com.caygiapha.familytree.dto.SignUpVerifyResponse;
import com.caygiapha.familytree.entity.Session;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.mindrot.jbcrypt.BCrypt;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.InvocationOnMock;

/**
 * Unit tests for {@link AuthService}: sign-up (1.5, 1.6, 1.9), verification-triggered single-tree
 * creation (13.1, 13.2), default region (9.2), and the tree-creation-failure path (13.3).
 *
 * <p>The {@link DuplicateIdentifierChecker} is mocked so the TAKEN / AVAILABLE / UNDETERMINED
 * outcomes can be driven directly; its own timeout behaviour is exercised in
 * {@link DuplicateIdentifierCheckerTest}.
 */
class AuthServiceTest {

    private static final String PHONE = "0912345678";
    private static final String EMAIL = "user@example.com";
    private static final String CODE = "123456";

    private UserRepository userRepository;
    private TreeRepository treeRepository;
    private DuplicateIdentifierChecker duplicateChecker;
    private VerificationCodeService verificationCodeService;
    private SessionService sessionService;
    private com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier googleIdTokenVerifier;
    private ConsentService consentService;

    private AuthService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        treeRepository = mock(TreeRepository.class);
        duplicateChecker = mock(DuplicateIdentifierChecker.class);
        verificationCodeService = mock(VerificationCodeService.class);
        sessionService = mock(SessionService.class);
        googleIdTokenVerifier = mock(com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier.class);
        consentService = mock(ConsentService.class);

        service = new AuthService(
                userRepository,
                treeRepository,
                new IdentifierValidator(),
                duplicateChecker,
                verificationCodeService,
                sessionService,
                googleIdTokenVerifier,
                consentService
        );

        // Repositories echo their argument, assigning an id to simulate persistence.
        when(userRepository.save(any(User.class))).thenAnswer((InvocationOnMock i) -> {
            User u = i.getArgument(0);
            if (u.getId() == null) {
                setId(u, "id", UUID.randomUUID());
            }
            return u;
        });
        when(treeRepository.save(any(Tree.class))).thenAnswer((InvocationOnMock i) -> {
            Tree t = i.getArgument(0);
            if (t.getId() == null) {
                setId(t, "id", UUID.randomUUID());
            }
            return t;
        });
    }

    // ----- Sign-up (1.5, 1.6, 1.9) -----

    @Test
    void signUpCreatesUnverifiedPhoneAccountAndIssuesCode() {
        when(duplicateChecker.check(IdentifierType.PHONE, PHONE))
                .thenReturn(DuplicateIdentifierChecker.Result.AVAILABLE);

        SignUpResponse response = service.signUp(PHONE);

        assertThat(response.verified()).isFalse(); // 1.5
        assertThat(response.userId()).isNotNull();

        var captor = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPhone()).isEqualTo(PHONE);
        assertThat(captor.getValue().getEmail()).isNull();
        assertThat(captor.getValue().isVerified()).isFalse();

        // 1.3 — a sign-up code is issued for the new account.
        verify(verificationCodeService)
                .issueForAccount(eq(VerificationPurpose.SIGNUP), any(UUID.class), eq(PHONE));
    }

    @Test
    void signUpCreatesEmailAccountWhenIdentifierIsEmail() {
        when(duplicateChecker.check(IdentifierType.EMAIL, EMAIL))
                .thenReturn(DuplicateIdentifierChecker.Result.AVAILABLE);

        service.signUp(EMAIL);

        var captor = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo(EMAIL);
        assertThat(captor.getValue().getPhone()).isNull();
    }

    @Test
    void signUpRejectsAlreadyRegisteredIdentifier() {
        when(duplicateChecker.check(IdentifierType.PHONE, PHONE))
                .thenReturn(DuplicateIdentifierChecker.Result.TAKEN);

        assertThatThrownBy(() -> service.signUp(PHONE))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.IDENTIFIER_TAKEN); // 1.6
                    assertThat(ex.field()).isEqualTo("identifier");
                });

        verify(userRepository, never()).save(any());
        verify(verificationCodeService, never())
                .issueForAccount(any(), any(), any());
    }

    @Test
    void signUpProceedsAsUnverifiedWhenDuplicateCheckIsUndetermined() {
        // 1.9 — the check could not conclude within the budget; create the account anyway.
        when(duplicateChecker.check(IdentifierType.PHONE, PHONE))
                .thenReturn(DuplicateIdentifierChecker.Result.UNDETERMINED);

        SignUpResponse response = service.signUp(PHONE);

        assertThat(response.verified()).isFalse();
        verify(userRepository).save(any(User.class));
        verify(verificationCodeService)
                .issueForAccount(eq(VerificationPurpose.SIGNUP), any(UUID.class), eq(PHONE));
    }

    @Test
    void signUpRejectsInvalidIdentifierWithoutCreatingAnAccount() {
        assertThatThrownBy(() -> service.signUp("not-an-identifier"))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR); // 1.7
                    assertThat(ex.field()).isEqualTo("identifier");
                });
        verify(userRepository, never()).save(any());
    }

    // ----- Verify + single-tree creation (13.1, 13.2, 9.2, 13.3) -----

    @Test
    void verifyMarksAccountVerifiedAndCreatesSingleTreeWithDefaultRegion() {
        User user = User.withPhone(PHONE);
        setId(user, "id", UUID.randomUUID());
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));
        when(treeRepository.findFirstByOwnerUserIdOrderByCreatedAtAsc(user.getId())).thenReturn(Optional.empty());

        SignUpVerifyResponse response = service.verifySignUp(PHONE, CODE);

        verify(verificationCodeService)
                .verifyForAccount(VerificationPurpose.SIGNUP, user.getId(), CODE);
        assertThat(user.isVerified()).isTrue(); // 1.5 -> verified
        verify(userRepository).save(user);

        // 13.1 / 9.2 — exactly one tree created with the default region.
        var captor = org.mockito.ArgumentCaptor.forClass(Tree.class);
        verify(treeRepository).save(captor.capture());
        assertThat(captor.getValue().getOwnerUserId()).isEqualTo(user.getId());
        assertThat(captor.getValue().getRegion()).isEqualTo("Bac");
        assertThat(response.region()).isEqualTo("Bac");
        assertThat(response.treeId()).isNotNull();
        assertThat(response.userId()).isEqualTo(user.getId());
    }

    @Test
    void verifyDoesNotCreateSecondTreeWhenUserAlreadyOwnsOne() {
        User user = User.withEmail(EMAIL);
        setId(user, "id", UUID.randomUUID());
        Tree existing = new Tree(user.getId(), "Trung");
        setId(existing, "id", UUID.randomUUID());
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(treeRepository.findFirstByOwnerUserIdOrderByCreatedAtAsc(user.getId())).thenReturn(Optional.of(existing));

        SignUpVerifyResponse response = service.verifySignUp(EMAIL, CODE);

        // 13.2 — no additional tree created; the existing single tree is retained.
        verify(treeRepository, never()).save(any());
        assertThat(response.treeId()).isEqualTo(existing.getId());
        assertThat(response.region()).isEqualTo("Trung");
    }

    @Test
    void verifyCreatesTreeWithTheChosenRegion() {
        User user = User.withPhone(PHONE);
        setId(user, "id", UUID.randomUUID());
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));
        when(treeRepository.findFirstByOwnerUserIdOrderByCreatedAtAsc(user.getId())).thenReturn(Optional.empty());

        SignUpVerifyResponse response = service.verifySignUp(PHONE, CODE, "Nam");

        var captor = org.mockito.ArgumentCaptor.forClass(Tree.class);
        verify(treeRepository).save(captor.capture());
        assertThat(captor.getValue().getRegion()).isEqualTo("Nam"); // 9.2 — owner-specified region
        assertThat(response.region()).isEqualTo("Nam");
    }

    @Test
    void verifyDefaultsToBacWhenRegionBlankOrNull() {
        User user = User.withPhone(PHONE);
        setId(user, "id", UUID.randomUUID());
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));
        when(treeRepository.findFirstByOwnerUserIdOrderByCreatedAtAsc(user.getId())).thenReturn(Optional.empty());

        SignUpVerifyResponse response = service.verifySignUp(PHONE, CODE, "   ");

        var captor = org.mockito.ArgumentCaptor.forClass(Tree.class);
        verify(treeRepository).save(captor.capture());
        assertThat(captor.getValue().getRegion()).isEqualTo("Bac"); // 9.2 default
        assertThat(response.region()).isEqualTo("Bac");
    }

    @Test
    void verifyRejectsInvalidRegionAndCreatesNothing() {
        User user = User.withPhone(PHONE);
        setId(user, "id", UUID.randomUUID());
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.verifySignUp(PHONE, CODE, "Saigon"))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR); // 9.6
                    assertThat(ex.field()).isEqualTo("region");
                });

        // The invalid region is rejected before verification and tree creation.
        verify(verificationCodeService, never()).verifyForAccount(any(), any(), any());
        verify(treeRepository, never()).save(any());
    }

    @Test
    void verifyRejectsUnknownIdentifier() {
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.verifySignUp(PHONE, CODE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.ACCOUNT_NOT_FOUND));

        verify(verificationCodeService, never()).verifyForAccount(any(), any(), any());
        verify(treeRepository, never()).save(any());
    }

    @Test
    void verifyDoesNotCreateTreeWhenCodeVerificationFails() {
        User user = User.withPhone(PHONE);
        setId(user, "id", UUID.randomUUID());
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));
        org.mockito.Mockito.doThrow(ApiException.codeInvalid("The verification code is incorrect."))
                .when(verificationCodeService)
                .verifyForAccount(VerificationPurpose.SIGNUP, user.getId(), CODE);

        assertThatThrownBy(() -> service.verifySignUp(PHONE, CODE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CODE_INVALID));

        assertThat(user.isVerified()).isFalse();
        verify(treeRepository, never()).save(any());
    }

    @Test
    void verifyPropagatesTreeCreationFailureSoNoTreeIsLeftBehind() {
        // 13.3 — when tree creation fails the error propagates (the @Mutation transaction rolls back).
        User user = User.withPhone(PHONE);
        setId(user, "id", UUID.randomUUID());
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));
        when(treeRepository.findFirstByOwnerUserIdOrderByCreatedAtAsc(user.getId())).thenReturn(Optional.empty());
        when(treeRepository.save(any(Tree.class)))
                .thenThrow(new RuntimeException("tree creation failed"));

        assertThatThrownBy(() -> service.verifySignUp(PHONE, CODE))
                .isInstanceOf(RuntimeException.class);
    }

    // ----- Sign-in (2.1, 2.4) -----

    @Test
    void signInIssuesCodeForVerifiedAccount() {
        User user = User.withPhone(PHONE);
        setId(user, "id", UUID.randomUUID());
        user.setVerified(true);
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));

        var response = service.signIn(PHONE);

        assertThat(response.userId()).isEqualTo(user.getId());
        // 2.1 — a sign-in code is issued for the verified account.
        verify(verificationCodeService)
                .issueForAccount(VerificationPurpose.SIGNIN, user.getId(), PHONE);
    }

    @Test
    void signInRejectsUnverifiedAccountWithoutIssuingCode() {
        // 2.4 — an account that has not completed verification is treated as not-found.
        User user = User.withPhone(PHONE);
        setId(user, "id", UUID.randomUUID());
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.signIn(PHONE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.ACCOUNT_NOT_FOUND));

        verify(verificationCodeService, never()).issueForAccount(any(), any(), any());
    }

    @Test
    void signInRejectsUnknownIdentifierWithoutIssuingCode() {
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.signIn(PHONE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.ACCOUNT_NOT_FOUND)); // 2.4

        verify(verificationCodeService, never()).issueForAccount(any(), any(), any());
    }

    @Test
    void signInRejectsInvalidIdentifier() {
        assertThatThrownBy(() -> service.signIn("not-an-identifier"))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR));

        verify(verificationCodeService, never()).issueForAccount(any(), any(), any());
    }

    @Test
    void signInWithPasswordEstablishesSessionForMatchingLegacyPasswordHash() {
        User user = User.withEmail(EMAIL);
        setId(user, "id", UUID.randomUUID());
        user.setVerified(true);
        user.setPasswordHash(BCrypt.hashpw("correct-password", BCrypt.gensalt()));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        Session session = new Session(user.getId(), Instant.now().plusSeconds(3600));
        when(sessionService.create(user.getId())).thenReturn(session);

        Session result = service.signInWithPassword(EMAIL, "correct-password");

        assertThat(result).isSameAs(session);
        verify(sessionService).create(user.getId());
        verify(verificationCodeService, never()).issueForAccount(any(), any(), any());
    }

    @Test
    void signInWithPasswordRejectsWrongPasswordWithoutCreatingSession() {
        User user = User.withEmail(EMAIL);
        setId(user, "id", UUID.randomUUID());
        user.setVerified(true);
        user.setPasswordHash(BCrypt.hashpw("correct-password", BCrypt.gensalt()));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.signInWithPassword(EMAIL, "wrong-password"))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("password");
                });

        verify(sessionService, never()).create(any());
    }

    @Test
    void signInWithPasswordRequiresPassword() {
        User user = User.withEmail(EMAIL);
        setId(user, "id", UUID.randomUUID());
        user.setVerified(true);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.signInWithPassword(EMAIL, ""))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("password");
                });

        verify(sessionService, never()).create(any());
    }

    @Test
    void signUpWithPasswordCreatesVerifiedUserTreeAndSession() {
        when(duplicateChecker.check(IdentifierType.EMAIL, EMAIL))
                .thenReturn(DuplicateIdentifierChecker.Result.AVAILABLE);
        Session session = new Session(UUID.randomUUID(), Instant.now().plusSeconds(3600));
        when(sessionService.create(any())).thenReturn(session);

        AuthService.PasswordSignUpResult result =
                service.signUpWithPassword(EMAIL, "strong-password", "Nam", true, true);

        assertThat(result.session()).isSameAs(session);
        assertThat(result.response().treeId()).isNotNull();
        assertThat(result.response().region()).isEqualTo("Nam");
        verify(consentService).requireConsent(true, true);
        verify(consentService).recordConsent(result.response().userId());
        verify(verificationCodeService, never()).issueForAccount(any(), any(), any());
    }

    @Test
    void signUpWithPasswordRequiresPassword() {
        assertThatThrownBy(() -> service.signUpWithPassword(EMAIL, "", "Bac", true, true))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("password");
                });

        verify(userRepository, never()).save(any());
        verify(sessionService, never()).create(any());
    }

    // ----- Sign-in verify + session establishment (2.2, 2.3, 2.5, 2.6) -----

    @Test
    void verifySignInEstablishesSessionOnSuccess() {
        User user = User.withPhone(PHONE);
        setId(user, "id", UUID.randomUUID());
        user.setVerified(true);
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));
        Session session = new Session(user.getId(), Instant.now().plusSeconds(3600));
        when(sessionService.create(user.getId())).thenReturn(session);

        Session result = service.verifySignIn(PHONE, CODE);

        // 2.2 — the submitted code is verified before any session work.
        verify(verificationCodeService)
                .verifyForAccount(VerificationPurpose.SIGNIN, user.getId(), CODE);
        // 2.3 — a 30-day session is established for the user.
        verify(sessionService).create(user.getId());
        assertThat(result).isSameAs(session);
    }

    @Test
    void verifySignInLeavesSessionUnchangedWhenCodeIsWrong() {
        // 2.5 — a wrong code throws before any session is created; no session mutation occurs.
        User user = User.withPhone(PHONE);
        setId(user, "id", UUID.randomUUID());
        user.setVerified(true);
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));
        org.mockito.Mockito.doThrow(ApiException.codeInvalid("The verification code is incorrect."))
                .when(verificationCodeService)
                .verifyForAccount(VerificationPurpose.SIGNIN, user.getId(), CODE);

        assertThatThrownBy(() -> service.verifySignIn(PHONE, CODE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CODE_INVALID));

        verify(sessionService, never()).create(any());
    }

    @Test
    void verifySignInLeavesSessionUnchangedWhenCodeIsExpired() {
        // 2.6 — an expired code throws before any session is created.
        User user = User.withEmail(EMAIL);
        setId(user, "id", UUID.randomUUID());
        user.setVerified(true);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        org.mockito.Mockito.doThrow(ApiException.codeExpired("This verification code has expired."))
                .when(verificationCodeService)
                .verifyForAccount(VerificationPurpose.SIGNIN, user.getId(), CODE);

        assertThatThrownBy(() -> service.verifySignIn(EMAIL, CODE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CODE_EXPIRED));

        verify(sessionService, never()).create(any());
    }

    @Test
    void verifySignInRejectsUnverifiedAccount() {
        User user = User.withPhone(PHONE);
        setId(user, "id", UUID.randomUUID());
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.verifySignIn(PHONE, CODE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.ACCOUNT_NOT_FOUND));

        verify(verificationCodeService, never()).verifyForAccount(any(), any(), any());
        verify(sessionService, never()).create(any());
    }

    // ----- Sign-out (2.8) -----

    @Test
    void signOutRevokesTheSession() {
        UUID token = UUID.randomUUID();

        service.signOut(token);

        verify(sessionService).revoke(token); // 2.8
    }

    /** Set a JPA-managed id via reflection for test fixtures. */
    private static void setId(Object entity, String fieldName, UUID id) {
        try {
            Field field = entity.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
