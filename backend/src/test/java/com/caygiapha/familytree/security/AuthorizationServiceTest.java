package com.caygiapha.familytree.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.security.AuthorizationService.Role;
import com.caygiapha.familytree.service.ClaimService;
import com.caygiapha.familytree.service.ConsentService;
import com.caygiapha.familytree.service.ShareTokenService;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link AuthorizationService} (Property 18; Requirements 11.6, 13.4, 13.5):
 *
 * <ul>
 *   <li>the tree owner is permitted to mutate their tree;</li>
 *   <li>the linked {@code Claimed_Node} user is permitted to edit their own node only;</li>
 *   <li>everyone else (including unauthenticated callers) is rejected with {@code NOT_AUTHORIZED}.
 * </ul>
 *
 * <p>A real {@link AuthContextHolder} is used (its {@link ThreadLocal} is bound per test and cleared
 * afterwards) while {@link ClaimService} is mocked to drive claim linkage.
 */
class AuthorizationServiceTest {

    private final AuthContextHolder holder = new AuthContextHolder();
    private final ClaimService claimService = mock(ClaimService.class);
    private final ConsentService consentService = mock(ConsentService.class);
    private final AuthorizationService service = new AuthorizationService(
            holder, claimService, mock(TreeRepository.class), mock(ShareTokenService.class),
            consentService);

    @AfterEach
    void tearDown() {
        holder.clear();
    }

    @Test
    void ownerIsPermittedToMutateOwnedTree() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        holder.set(AuthContext.authenticated(userId, treeId));

        assertThat(service.classify(treeId, null)).isEqualTo(Role.OWNER);
        assertThatCode(() -> service.requireMutationPermitted(treeId, UUID.randomUUID()))
                .doesNotThrowAnyException(); // 13.4 — owner may edit any node in their tree
        assertThatCode(() -> service.requireOwner(treeId)).doesNotThrowAnyException();
        assertThat(service.requireOwnedTreeId()).isEqualTo(treeId);
    }

    @Test
    void ownerWithStaleConsentIsBlockedFromMutatingUntilReacceptance() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        holder.set(AuthContext.authenticated(userId, treeId));
        when(consentService.needsReacceptance(userId)).thenReturn(true); // 23.4 — version bumped

        assertThatThrownBy(() -> service.requireOwner(treeId))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThatThrownBy(() -> service.requireMutationPermitted(treeId, UUID.randomUUID()))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        // Classification itself is unaffected; only the mutation gate blocks.
        assertThat(service.classify(treeId, null)).isEqualTo(Role.OWNER);
    }

    @Test
    void linkedUserIsPermittedToEditOwnClaimedNodeOnly() {
        UUID userId = UUID.randomUUID();
        UUID ownedTreeId = UUID.randomUUID(); // the linked user may own no tree; use none
        UUID targetTreeId = UUID.randomUUID(); // the owner's tree, not the linked user's
        UUID claimedPerson = UUID.randomUUID();
        UUID otherPerson = UUID.randomUUID();
        holder.set(AuthContext.authenticated(userId, null));
        when(claimService.isLinkedUser(claimedPerson, userId)).thenReturn(true);
        lenient().when(claimService.isLinkedUser(otherPerson, userId)).thenReturn(false);

        // 11.6 — linked user may edit their own claimed node.
        assertThat(service.classify(targetTreeId, claimedPerson))
                .isEqualTo(Role.LINKED_CLAIMED_USER);
        assertThatCode(() -> service.requireMutationPermitted(targetTreeId, claimedPerson))
                .doesNotThrowAnyException();

        // 13.5 — but not a different node, and not the unused ownedTreeId tree they don't own.
        assertThat(service.classify(targetTreeId, otherPerson)).isEqualTo(Role.NEITHER);
        assertThatThrownBy(() -> service.requireMutationPermitted(targetTreeId, otherPerson))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
        assertThat(ownedTreeId).isNotEqualTo(targetTreeId); // guard: distinct trees in fixture
    }

    @Test
    void nonOwnerNonLinkedUserIsRejected() {
        UUID userId = UUID.randomUUID();
        UUID targetTreeId = UUID.randomUUID();
        UUID targetPerson = UUID.randomUUID();
        holder.set(AuthContext.authenticated(userId, UUID.randomUUID()));
        when(claimService.isLinkedUser(targetPerson, userId)).thenReturn(false);

        assertThat(service.classify(targetTreeId, targetPerson)).isEqualTo(Role.NEITHER);
        assertThatThrownBy(() -> service.requireMutationPermitted(targetTreeId, targetPerson))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED)); // 13.5
        assertThatThrownBy(() -> service.requireOwner(targetTreeId))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
    }

    @Test
    void unauthenticatedCallerIsAlwaysNeither() {
        holder.set(AuthContext.anonymous());

        assertThat(service.classify(UUID.randomUUID(), UUID.randomUUID()))
                .isEqualTo(Role.NEITHER);
        assertThatThrownBy(
                        () -> service.requireMutationPermitted(UUID.randomUUID(), UUID.randomUUID()))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
        assertThatThrownBy(service::requireOwnedTreeId)
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
    }

    @Test
    void authenticatedOwnerWithoutTreeCannotResolveOwnedTree() {
        holder.set(AuthContext.authenticated(UUID.randomUUID(), null));

        assertThatThrownBy(service::requireOwnedTreeId)
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
    }
}
