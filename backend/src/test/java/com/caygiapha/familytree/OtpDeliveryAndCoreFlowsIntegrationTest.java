package com.caygiapha.familytree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.caygiapha.familytree.entity.Claim;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.service.AuthService;
import com.caygiapha.familytree.service.ClaimService;
import com.caygiapha.familytree.service.DuplicateIdentifierChecker;
import com.caygiapha.familytree.service.IdentifierValidator;
import com.caygiapha.familytree.service.OtpDeliveryProvider;
import com.caygiapha.familytree.service.SessionService;
import com.caygiapha.familytree.service.VerificationCodeGenerator;
import com.caygiapha.familytree.service.VerificationCodeHasher;
import com.caygiapha.familytree.service.VerificationCodeService;
import com.caygiapha.familytree.service.VerificationPurpose;
import com.caygiapha.familytree.support.InMemoryClaimRepository;
import com.caygiapha.familytree.support.InMemoryPersonRepository;
import com.caygiapha.familytree.support.InMemoryRepository;
import com.caygiapha.familytree.support.InMemorySessionRepository;
import com.caygiapha.familytree.support.InMemoryTransactionManager;
import com.caygiapha.familytree.support.InMemoryTreeRepository;
import com.caygiapha.familytree.support.InMemoryUserRepository;
import com.caygiapha.familytree.support.InMemoryVerificationCodeRepository;
import com.caygiapha.familytree.support.MutableClock;
import com.caygiapha.familytree.support.RecordingOtpDeliveryProvider;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Docker-free service-level integration tests for OTP delivery and the core auth/claim flows
 * (Requirements 1.3, 2.1, 11.1; design Security Considerations — a provider outage must never
 * persist a session or claim without a verified code).
 *
 * <p>These tests assemble the <em>real</em> domain services ({@link AuthService},
 * {@link VerificationCodeService}, {@link ClaimService}, {@link SessionService} with the real
 * {@link VerificationCodeGenerator}/{@link VerificationCodeHasher}/{@link IdentifierValidator}) over
 * map-backed in-memory repositories and a {@link RecordingOtpDeliveryProvider} that captures the
 * delivered plaintext code and destination. A {@link InMemoryTransactionManager} gives the real
 * {@code @Mutation} methods genuine transaction semantics, so the provider-failure test proves
 * issuance rolls back with nothing left behind — all without Docker or a database.
 *
 * <p>The {@code @SpringBootTest} path that boots Testcontainers Postgres is intentionally avoided
 * here so this suite runs without Docker. The Docker-dependent context/migration check lives in
 * {@link FamilyTreeApiApplicationTests} (tagged {@code @Tag("integration")}), which is not run in
 * this environment.
 */
class OtpDeliveryAndCoreFlowsIntegrationTest {

    private static final String OWNER_PHONE = "0912345678";
    private static final String RECIPIENT_EMAIL = "relative@example.com";
    private static final Instant T0 = Instant.parse("2024-01-01T00:00:00Z");

    private AnnotationConfigApplicationContext context;
    private AuthService authService;
    private ClaimService claimService;
    private RecordingOtpDeliveryProvider otpProvider;
    private MutableClock clock;
    private InMemoryUserRepository userRepository;
    private InMemoryTreeRepository treeRepository;
    private InMemoryPersonRepository personRepository;
    private InMemoryClaimRepository claimRepository;
    private InMemoryVerificationCodeRepository verificationCodeRepository;
    private InMemorySessionRepository sessionRepository;

    @BeforeEach
    void setUp() {
        context = new AnnotationConfigApplicationContext(TestConfig.class);
        authService = context.getBean(AuthService.class);
        claimService = context.getBean(ClaimService.class);
        otpProvider = context.getBean(RecordingOtpDeliveryProvider.class);
        clock = context.getBean(MutableClock.class);
        userRepository = context.getBean(InMemoryUserRepository.class);
        treeRepository = context.getBean(InMemoryTreeRepository.class);
        personRepository = context.getBean(InMemoryPersonRepository.class);
        claimRepository = context.getBean(InMemoryClaimRepository.class);
        verificationCodeRepository = context.getBean(InMemoryVerificationCodeRepository.class);
        sessionRepository = context.getBean(InMemorySessionRepository.class);
    }

    @AfterEach
    void tearDown() {
        if (context != null) {
            context.close();
        }
    }

    // ----- OTP delivery: destination + 6-digit code (1.3, 2.1, 11.1) -----

    @Test
    @DisplayName("Sign-up delivers a 6-digit code to the provided destination (1.3)")
    void signUpDeliversSixDigitCodeToDestination() {
        authService.signUp(OWNER_PHONE, "Nguyễn Văn A");

        assertThat(otpProvider.deliveryCount()).isEqualTo(1);
        RecordingOtpDeliveryProvider.Delivery delivery =
                otpProvider.lastDelivery(VerificationPurpose.SIGNUP).orElseThrow();
        assertThat(delivery.destination()).isEqualTo(OWNER_PHONE);
        assertThat(delivery.code()).matches("\\d{6}"); // 6-digit numeric (1.3)
        // The plaintext is never persisted: the stored row carries only a hash.
        assertThat(verificationCodeRepository.findAll())
                .singleElement()
                .satisfies(code -> assertThat(code.getCodeHash()).doesNotContain(delivery.code()));
    }

    @Test
    @DisplayName("Sign-in delivers a 6-digit code for a verified account (2.1)")
    void signInDeliversSixDigitCodeForVerifiedAccount() {
        verifiedAccount(OWNER_PHONE);
        otpProvider.clear();

        authService.signIn(OWNER_PHONE);

        RecordingOtpDeliveryProvider.Delivery delivery =
                otpProvider.lastDelivery(VerificationPurpose.SIGNIN).orElseThrow();
        assertThat(delivery.destination()).isEqualTo(OWNER_PHONE);
        assertThat(delivery.code()).matches("\\d{6}"); // 6-digit numeric (2.1)
    }

    @Test
    @DisplayName("Invite delivers a 6-digit claim code to the recipient (11.1)")
    void inviteDeliversSixDigitClaimCode() {
        Tree tree = treeRepository.save(new Tree(userRepository.save(User.withPhone(OWNER_PHONE)).getId()));
        Person person = personRepository.save(new Person(tree.getId(), "Bác Hai", "male"));
        otpProvider.clear();

        claimService.invite(tree.getId(), person.getId(), RECIPIENT_EMAIL);

        RecordingOtpDeliveryProvider.Delivery delivery =
                otpProvider.lastDelivery(VerificationPurpose.CLAIM).orElseThrow();
        assertThat(delivery.destination()).isEqualTo(RECIPIENT_EMAIL);
        assertThat(delivery.code()).matches("\\d{6}"); // 6-digit numeric (11.1)
    }

    // ----- Validity window timing (1.4) -----

    @Test
    @DisplayName("A sign-up code is accepted within its 300s validity window (1.4)")
    void codeAcceptedWithinValidityWindow() {
        authService.signUp(OWNER_PHONE, "Nguyễn Văn A");
        String code = otpProvider.lastDelivery(VerificationPurpose.SIGNUP).orElseThrow().code();

        clock.advance(Duration.ofSeconds(299)); // still inside the 300s window

        // No exception => accepted; the account becomes verified and its tree is created.
        var response = authService.verifySignUp(OWNER_PHONE, code);
        assertThat(userRepository.findByPhone(OWNER_PHONE).orElseThrow().isVerified()).isTrue();
        assertThat(response.treeId()).isNotNull();
    }

    @Test
    @DisplayName("A sign-up code is rejected once past its 300s validity window (1.4)")
    void codeRejectedAfterValidityWindow() {
        authService.signUp(OWNER_PHONE, "Nguyễn Văn A");
        String code = otpProvider.lastDelivery(VerificationPurpose.SIGNUP).orElseThrow().code();

        clock.advance(Duration.ofSeconds(301)); // just past the 300s window

        assertThatThrownBy(() -> authService.verifySignUp(OWNER_PHONE, code))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CODE_EXPIRED));
        // Rejected: the account stays unverified and no tree is created.
        assertThat(userRepository.findByPhone(OWNER_PHONE).orElseThrow().isVerified()).isFalse();
        assertThat(treeRepository.count()).isZero();
    }

    // ----- End-to-end sign-up -> verify -> tree creation (1.3, 13.1, 9.2) -----

    @Test
    @DisplayName("Sign-up -> verify creates exactly one tree with the default region Bac")
    void endToEndSignUpVerifyCreatesSingleTreeWithDefaultRegion() {
        authService.signUp(OWNER_PHONE, "Nguyễn Văn A");
        String code = otpProvider.lastDelivery(VerificationPurpose.SIGNUP).orElseThrow().code();

        var response = authService.verifySignUp(OWNER_PHONE, code);

        User user = userRepository.findByPhone(OWNER_PHONE).orElseThrow();
        assertThat(user.isVerified()).isTrue();
        // Exactly one tree, owned by the user, default region Bac (13.1, 9.2).
        assertThat(treeRepository.count()).isEqualTo(1);
        Tree tree = treeRepository.findByOwnerUserId(user.getId()).orElseThrow();
        assertThat(tree.getRegion()).isEqualTo("Bac");
        assertThat(response.treeId()).isEqualTo(tree.getId());
        assertThat(response.region()).isEqualTo("Bac");
    }

    // ----- Invite -> claim flow (11.1, 11.2) -----

    @Test
    @DisplayName("Invite -> verifyClaim links the person node to the recipient account (11.1, 11.2)")
    void inviteThenClaimLinksPersonToRecipient() {
        // Owner with a tree and an unclaimed person node.
        User owner = userRepository.save(User.withPhone(OWNER_PHONE));
        Tree tree = treeRepository.save(new Tree(owner.getId()));
        Person person = personRepository.save(new Person(tree.getId(), "Cô Ba", "female"));
        // The recipient already has an account (created by their own sign-up).
        User recipient = userRepository.save(User.withEmail(RECIPIENT_EMAIL));

        claimService.invite(tree.getId(), person.getId(), RECIPIENT_EMAIL);
        String claimCode = otpProvider.lastDelivery(VerificationPurpose.CLAIM).orElseThrow().code();

        Claim claim = claimService.verifyClaim(tree.getId(), person.getId(), RECIPIENT_EMAIL, claimCode);

        // 11.2 — a claims row links the person to the recipient's account.
        assertThat(claim.getPersonId()).isEqualTo(person.getId());
        assertThat(claim.getUserId()).isEqualTo(recipient.getId());
        assertThat(claimRepository.findByPersonId(person.getId())).isPresent();
        assertThat(claimService.isLinkedUser(person.getId(), recipient.getId())).isTrue();
    }

    // ----- Provider failure leaves no half-created state (Security Considerations) -----

    @Test
    @DisplayName("Sign-up rolls back fully when OTP delivery fails: no user, no code, no session")
    void providerFailureOnSignUpPersistsNothing() {
        otpProvider.failNextDelivery();

        assertThatThrownBy(() -> authService.signUp(OWNER_PHONE, "Nguyễn Văn A"))
                .isInstanceOf(OtpDeliveryProvider.OtpDeliveryException.class);

        // The @Mutation transaction rolled the whole sign-up back: nothing persisted.
        assertThat(verificationCodeRepository.count()).isZero();
        assertThat(userRepository.count()).isZero();
        assertThat(sessionRepository.count()).isZero();
    }

    @Test
    @DisplayName("Invite rolls back when OTP delivery fails: no claim code persisted, node unclaimed")
    void providerFailureOnInvitePersistsNoClaimCode() {
        User owner = userRepository.save(User.withPhone(OWNER_PHONE));
        Tree tree = treeRepository.save(new Tree(owner.getId()));
        Person person = personRepository.save(new Person(tree.getId(), "Chú Tư", "male"));
        long usersBefore = userRepository.count();
        long personsBefore = personRepository.count();

        otpProvider.failNextDelivery();

        assertThatThrownBy(() -> claimService.invite(tree.getId(), person.getId(), RECIPIENT_EMAIL))
                .isInstanceOf(OtpDeliveryProvider.OtpDeliveryException.class);

        // No claim code persisted and no claim created; pre-existing setup rows untouched.
        assertThat(verificationCodeRepository.count()).isZero();
        assertThat(claimRepository.count()).isZero();
        assertThat(claimService.isClaimed(person.getId())).isFalse();
        assertThat(userRepository.count()).isEqualTo(usersBefore);
        assertThat(personRepository.count()).isEqualTo(personsBefore);
    }

    @Test
    @DisplayName("After a failed delivery, a retry succeeds and persists exactly one code")
    void retryAfterProviderFailureSucceeds() {
        otpProvider.failNextDelivery();
        assertThatThrownBy(() -> authService.signUp(OWNER_PHONE, "Nguyễn Văn A"))
                .isInstanceOf(OtpDeliveryProvider.OtpDeliveryException.class);
        assertThat(verificationCodeRepository.count()).isZero();

        otpProvider.resumeDelivery();
        authService.signUp(OWNER_PHONE, "Nguyễn Văn A");

        assertThat(userRepository.count()).isEqualTo(1);
        assertThat(verificationCodeRepository.count()).isEqualTo(1);
        assertThat(otpProvider.lastDelivery(VerificationPurpose.SIGNUP)).isPresent();
    }

    // ----- helpers -----

    /** Drive a full sign-up + verification so the identifier becomes a verified account. */
    private void verifiedAccount(String identifier) {
        authService.signUp(identifier, "Nguyễn Văn A");
        String code = otpProvider.lastDelivery(VerificationPurpose.SIGNUP).orElseThrow().code();
        authService.verifySignUp(identifier, code);
    }

    /**
     * Spring context wiring the real domain services as transactional proxies over in-memory
     * repositories, a recording OTP provider, and a mutable clock — no database, no Docker.
     */
    @Configuration
    @EnableTransactionManagement(proxyTargetClass = true)
    static class TestConfig {

        @Bean
        MutableClock clock() {
            return MutableClock.at(T0);
        }

        @Bean
        RecordingOtpDeliveryProvider otpProvider() {
            return new RecordingOtpDeliveryProvider();
        }

        @Bean
        InMemoryUserRepository userRepository() {
            return new InMemoryUserRepository();
        }

        @Bean
        InMemoryTreeRepository treeRepository() {
            return new InMemoryTreeRepository();
        }

        @Bean
        InMemoryPersonRepository personRepository() {
            return new InMemoryPersonRepository();
        }

        @Bean
        InMemoryClaimRepository claimRepository() {
            return new InMemoryClaimRepository();
        }

        @Bean
        InMemoryVerificationCodeRepository verificationCodeRepository() {
            return new InMemoryVerificationCodeRepository();
        }

        @Bean
        InMemorySessionRepository sessionRepository() {
            return new InMemorySessionRepository();
        }

        @Bean
        VerificationCodeGenerator verificationCodeGenerator() {
            return new VerificationCodeGenerator();
        }

        @Bean
        VerificationCodeHasher verificationCodeHasher() {
            return new VerificationCodeHasher();
        }

        @Bean
        IdentifierValidator identifierValidator() {
            return new IdentifierValidator();
        }

        @Bean
        DuplicateIdentifierChecker duplicateIdentifierChecker(InMemoryUserRepository userRepository) {
            return new DuplicateIdentifierChecker(userRepository);
        }

        @Bean
        SessionService sessionService(InMemorySessionRepository sessionRepository, Clock clock) {
            return new SessionService(sessionRepository, clock);
        }

        @Bean
        VerificationCodeService verificationCodeService(
                InMemoryVerificationCodeRepository repository,
                VerificationCodeGenerator generator,
                VerificationCodeHasher hasher,
                RecordingOtpDeliveryProvider deliveryProvider,
                Clock clock) {
            return new VerificationCodeService(repository, generator, hasher, deliveryProvider, clock);
        }

        @Bean
        AuthService authService(
                InMemoryUserRepository userRepository,
                InMemoryTreeRepository treeRepository,
                IdentifierValidator identifierValidator,
                DuplicateIdentifierChecker duplicateIdentifierChecker,
                VerificationCodeService verificationCodeService,
                SessionService sessionService) {
            return new AuthService(
                    userRepository,
                    treeRepository,
                    identifierValidator,
                    duplicateIdentifierChecker,
                    verificationCodeService,
                    sessionService,
                    null,
                    null);
        }

        @Bean
        ClaimService claimService(
                InMemoryClaimRepository claimRepository,
                InMemoryPersonRepository personRepository,
                InMemoryUserRepository userRepository,
                IdentifierValidator identifierValidator,
                VerificationCodeService verificationCodeService) {
            return new ClaimService(
                    claimRepository,
                    personRepository,
                    userRepository,
                    identifierValidator,
                    verificationCodeService);
        }

        @Bean
        PlatformTransactionManager transactionManager(
                InMemoryUserRepository userRepository,
                InMemoryTreeRepository treeRepository,
                InMemoryPersonRepository personRepository,
                InMemoryClaimRepository claimRepository,
                InMemoryVerificationCodeRepository verificationCodeRepository,
                InMemorySessionRepository sessionRepository) {
            List<InMemoryRepository<?>> repositories = List.of(
                    userRepository,
                    treeRepository,
                    personRepository,
                    claimRepository,
                    verificationCodeRepository,
                    sessionRepository);
            return new InMemoryTransactionManager(repositories);
        }
    }
}
