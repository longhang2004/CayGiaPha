package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Claim;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.ClaimRepository;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.UserRepository;
import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.InvocationOnMock;

/**
 * Unit tests for {@link ClaimService}: node invitation (11.1, 11.7), claim verification and linkage
 * (11.2), wrong/expired-code rejection leaving the node unclaimed (11.3, 11.4), already-claimed
 * rejection (11.7), and the linked-user edit-permission query (11.6).
 *
 * <p>The {@link VerificationCodeService} is mocked so issuing/verifying outcomes can be driven
 * directly; its own validity-window/lockout behaviour is exercised in its dedicated tests.
 */
class ClaimServiceTest {

    private static final UUID TREE_ID = UUID.randomUUID();
    private static final String PHONE = "0912345678";
    private static final String EMAIL = "relative@example.com";
    private static final String CODE = "123456";

    private ClaimRepository claimRepository;
    private PersonRepository personRepository;
    private UserRepository userRepository;
    private VerificationCodeService verificationCodeService;
    private ClaimService service;

    @BeforeEach
    void setUp() {
        claimRepository = mock(ClaimRepository.class);
        personRepository = mock(PersonRepository.class);
        userRepository = mock(UserRepository.class);
        verificationCodeService = mock(VerificationCodeService.class);
        service = new ClaimService(
                claimRepository,
                personRepository,
                userRepository,
                new IdentifierValidator(),
                verificationCodeService);

        // Claim repository echoes its argument, assigning an id to simulate persistence.
        when(claimRepository.save(any(Claim.class))).thenAnswer((InvocationOnMock i) -> {
            Claim c = i.getArgument(0);
            if (c.getId() == null) {
                setId(c, "id", UUID.randomUUID());
            }
            return c;
        });
    }

    // ----- Invite (11.1, 11.7) -----

    @Test
    void inviteIssuesClaimCodeForAnUnclaimedNode() {
        UUID personId = givenPersonInTree();
        when(claimRepository.existsByPersonId(personId)).thenReturn(false);

        service.invite(TREE_ID, personId, PHONE);

        // 11.1 — a 15-minute claim code is issued for the node, delivered to the destination.
        verify(verificationCodeService).issueForNode(personId, PHONE);
    }

    @Test
    void inviteRejectsAlreadyClaimedNode() {
        UUID personId = givenPersonInTree();
        when(claimRepository.existsByPersonId(personId)).thenReturn(true);

        assertThatThrownBy(() -> service.invite(TREE_ID, personId, PHONE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.ALREADY_CLAIMED)); // 11.7

        verify(verificationCodeService, never()).issueForNode(any(), any());
    }

    @Test
    void inviteRejectsNodeNotInTree() {
        UUID personId = UUID.randomUUID();
        when(personRepository.findByIdAndTreeId(personId, TREE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.invite(TREE_ID, personId, PHONE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NODE_NOT_ACCESSIBLE));

        verify(verificationCodeService, never()).issueForNode(any(), any());
    }

    @Test
    void inviteRejectsInvalidDestination() {
        UUID personId = givenPersonInTree();

        assertThatThrownBy(() -> service.invite(TREE_ID, personId, "not-an-identifier"))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("destination");
                });

        verify(verificationCodeService, never()).issueForNode(any(), any());
    }

    // ----- Verify + linkage (11.2, 11.3, 11.4, 11.7) -----

    @Test
    void verifyCreatesClaimLinkingNodeToRecipientAccount() {
        UUID personId = givenPersonInTree();
        when(claimRepository.existsByPersonId(personId)).thenReturn(false);
        User recipient = User.withEmail(EMAIL);
        setId(recipient, "id", UUID.randomUUID());
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(recipient));

        Claim claim = service.verifyClaim(TREE_ID, personId, EMAIL, CODE);

        // 11.4/11.5 enforcement delegated to the verification primitive.
        verify(verificationCodeService).verifyForNode(personId, CODE);
        // 11.2 — a claim row links the node to the recipient's account.
        verify(claimRepository).save(any(Claim.class));
        assertThat(claim.getPersonId()).isEqualTo(personId);
        assertThat(claim.getUserId()).isEqualTo(recipient.getId());
    }

    @Test
    void verifyRejectsWrongCodeLeavingNodeUnclaimed() {
        UUID personId = givenPersonInTree();
        when(claimRepository.existsByPersonId(personId)).thenReturn(false);
        User recipient = User.withPhone(PHONE);
        setId(recipient, "id", UUID.randomUUID());
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(recipient));
        org.mockito.Mockito.doThrow(ApiException.codeInvalid("The verification code is incorrect."))
                .when(verificationCodeService)
                .verifyForNode(personId, CODE);

        assertThatThrownBy(() -> service.verifyClaim(TREE_ID, personId, PHONE, CODE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CODE_INVALID)); // 11.3

        // 11.3 — no claim is created; the node remains unclaimed.
        verify(claimRepository, never()).save(any());
    }

    @Test
    void verifyRejectsExpiredCodeLeavingNodeUnclaimed() {
        UUID personId = givenPersonInTree();
        when(claimRepository.existsByPersonId(personId)).thenReturn(false);
        User recipient = User.withPhone(PHONE);
        setId(recipient, "id", UUID.randomUUID());
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(recipient));
        org.mockito.Mockito.doThrow(ApiException.codeExpired("This verification code has expired."))
                .when(verificationCodeService)
                .verifyForNode(personId, CODE);

        assertThatThrownBy(() -> service.verifyClaim(TREE_ID, personId, PHONE, CODE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CODE_EXPIRED)); // 11.4

        verify(claimRepository, never()).save(any());
    }

    @Test
    void verifyRejectsAlreadyClaimedNode() {
        UUID personId = givenPersonInTree();
        when(claimRepository.existsByPersonId(personId)).thenReturn(true);

        assertThatThrownBy(() -> service.verifyClaim(TREE_ID, personId, EMAIL, CODE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.ALREADY_CLAIMED)); // 11.7

        verify(verificationCodeService, never()).verifyForNode(any(), any());
        verify(claimRepository, never()).save(any());
    }

    @Test
    void verifyRejectsUnknownIdentifier() {
        UUID personId = givenPersonInTree();
        when(claimRepository.existsByPersonId(personId)).thenReturn(false);
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.verifyClaim(TREE_ID, personId, PHONE, CODE))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.ACCOUNT_NOT_FOUND));

        verify(verificationCodeService, never()).verifyForNode(any(), any());
        verify(claimRepository, never()).save(any());
    }

    // ----- Linked-user edit permission (11.6) -----

    @Test
    void isLinkedUserReflectsClaimLinkage() {
        UUID personId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(claimRepository.existsByPersonIdAndUserId(personId, userId)).thenReturn(true);

        assertThat(service.isLinkedUser(personId, userId)).isTrue(); // 11.6
        assertThat(service.isLinkedUser(null, userId)).isFalse();
        assertThat(service.isLinkedUser(personId, null)).isFalse();
    }

    @Test
    void isClaimedReflectsClaimPresence() {
        UUID personId = UUID.randomUUID();
        when(claimRepository.existsByPersonId(personId)).thenReturn(true);

        assertThat(service.isClaimed(personId)).isTrue();
        assertThat(service.isClaimed(null)).isFalse();
    }

    @Test
    void findClaimReturnsLinkageWhenClaimed() {
        UUID personId = UUID.randomUUID();
        Claim claim = new Claim(personId, UUID.randomUUID());
        when(claimRepository.findByPersonId(personId)).thenReturn(Optional.of(claim));

        assertThat(service.findClaim(personId)).contains(claim);
        assertThat(service.findClaim(null)).isEmpty();
    }

    private UUID givenPersonInTree() {
        UUID personId = UUID.randomUUID();
        Person person = new Person(TREE_ID, "Relative", "female");
        setId(person, "id", personId);
        when(personRepository.findByIdAndTreeId(personId, TREE_ID)).thenReturn(Optional.of(person));
        return personId;
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
