package com.caygiapha.familytree.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.TreeCollaboratorRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.security.AuthorizationService.Role;
import com.caygiapha.familytree.service.ClaimService;
import com.caygiapha.familytree.service.ConsentService;
import com.caygiapha.familytree.service.ShareTokenService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link AuthorizationService} (Property 18; Requirements 11.6, 13.4, 13.5).
 */
class AuthorizationServiceTest {

    private final AuthContextHolder holder = new AuthContextHolder();
    private final ClaimService claimService = mock(ClaimService.class);
    private final ConsentService consentService = mock(ConsentService.class);
    private final ShareTokenService shareTokenService = mock(ShareTokenService.class);
    private final TreeRepository treeRepository = mock(TreeRepository.class);
    private final TreeCollaboratorRepository collaboratorRepository = mock(TreeCollaboratorRepository.class);
    private final AuthorizationService service = new AuthorizationService(
            holder, claimService, treeRepository, collaboratorRepository, shareTokenService,
            consentService);

    @AfterEach
    void tearDown() {
        holder.clear();
    }

    private void stubOwnedTree(UUID treeId, UUID ownerUserId) {
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(new Tree(ownerUserId)));
    }

    @Test
    void ownerIsPermittedToMutateOwnedTree() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        holder.set(AuthContext.authenticated(userId, treeId));
        stubOwnedTree(treeId, userId);

        assertThat(service.classify(treeId, null)).isEqualTo(Role.OWNER);
        assertThatCode(() -> service.requireMutationPermitted(treeId, UUID.randomUUID()))
                .doesNotThrowAnyException();
        assertThatCode(() -> service.requireOwner(treeId)).doesNotThrowAnyException();
        assertThat(service.requireOwnedTreeId()).isEqualTo(treeId);
    }

    @Test
    void ownerOfSecondTreeIsPermittedEvenWhenOwnedTreeIdIsFirstTree() {
        UUID userId = UUID.randomUUID();
        UUID firstTreeId = UUID.randomUUID();
        UUID secondTreeId = UUID.randomUUID();
        holder.set(AuthContext.authenticated(userId, firstTreeId));
        stubOwnedTree(secondTreeId, userId);

        assertThat(service.classify(secondTreeId, null)).isEqualTo(Role.OWNER);
        assertThatCode(() -> service.requireOwner(secondTreeId)).doesNotThrowAnyException();
    }

    @Test
    void ownerWithStaleConsentIsBlockedFromMutatingUntilReacceptance() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        holder.set(AuthContext.authenticated(userId, treeId));
        stubOwnedTree(treeId, userId);
        when(consentService.needsReacceptance(userId)).thenReturn(true);

        assertThatThrownBy(() -> service.requireOwner(treeId))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThatThrownBy(() -> service.requireMutationPermitted(treeId, UUID.randomUUID()))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThat(service.classify(treeId, null)).isEqualTo(Role.OWNER);
    }

    @Test
    void linkedUserIsPermittedToEditOwnClaimedNodeOnly() {
        UUID userId = UUID.randomUUID();
        UUID ownedTreeId = UUID.randomUUID();
        UUID targetTreeId = UUID.randomUUID();
        UUID claimedPerson = UUID.randomUUID();
        UUID otherPerson = UUID.randomUUID();
        holder.set(AuthContext.authenticated(userId, null));
        when(treeRepository.findById(targetTreeId)).thenReturn(Optional.of(new Tree(UUID.randomUUID())));
        when(claimService.isLinkedUser(claimedPerson, userId)).thenReturn(true);
        lenient().when(claimService.isLinkedUser(otherPerson, userId)).thenReturn(false);

        assertThat(service.classify(targetTreeId, claimedPerson))
                .isEqualTo(Role.LINKED_CLAIMED_USER);
        assertThatCode(() -> service.requireMutationPermitted(targetTreeId, claimedPerson))
                .doesNotThrowAnyException();

        assertThat(service.classify(targetTreeId, otherPerson)).isEqualTo(Role.NEITHER);
        assertThatThrownBy(() -> service.requireMutationPermitted(targetTreeId, otherPerson))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
        assertThat(ownedTreeId).isNotEqualTo(targetTreeId);
    }

    @Test
    void nonOwnerNonLinkedUserIsRejected() {
        UUID userId = UUID.randomUUID();
        UUID targetTreeId = UUID.randomUUID();
        UUID targetPerson = UUID.randomUUID();
        holder.set(AuthContext.authenticated(userId, UUID.randomUUID()));
        when(treeRepository.findById(targetTreeId)).thenReturn(Optional.of(new Tree(UUID.randomUUID())));
        when(claimService.isLinkedUser(targetPerson, userId)).thenReturn(false);

        assertThat(service.classify(targetTreeId, targetPerson)).isEqualTo(Role.NEITHER);
        assertThatThrownBy(() -> service.requireMutationPermitted(targetTreeId, targetPerson))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
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

    @Test
    void classifiesTreeLevelOwnerContributorLinkedAndReaderWithoutChangingMutationRoles() {
        UUID treeId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Tree tree = new Tree(UUID.randomUUID());
        holder.set(AuthContext.authenticated(userId, null));
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));

        when(collaboratorRepository.existsByTreeIdAndUserId(treeId, userId)).thenReturn(true);
        assertThat(service.classifyTreeAccess(treeId, null)).isEqualTo(TreeAccessRole.CONTRIBUTOR);

        when(collaboratorRepository.existsByTreeIdAndUserId(treeId, userId)).thenReturn(false);
        when(claimService.isLinkedToTree(treeId, userId)).thenReturn(true);
        assertThat(service.classifyTreeAccess(treeId, null)).isEqualTo(TreeAccessRole.LINKED);

        when(claimService.isLinkedToTree(treeId, userId)).thenReturn(false);
        tree.setSharing("public");
        assertThat(service.classifyTreeAccess(treeId, null)).isEqualTo(TreeAccessRole.READER);
        assertThat(service.classify(treeId, null)).isEqualTo(Role.NEITHER);
    }

    @Test
    void classifiesOwnedTreeAndDeniedOrAnonymousTreeAccess() {
        UUID treeId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        holder.set(AuthContext.authenticated(userId, null));
        stubOwnedTree(treeId, userId);

        assertThat(service.classifyTreeAccess(treeId, null)).isEqualTo(TreeAccessRole.OWNER);

        UUID privateTreeId = UUID.randomUUID();
        when(treeRepository.findById(privateTreeId))
                .thenReturn(Optional.of(new Tree(UUID.randomUUID())));
        assertThat(service.classifyTreeAccess(privateTreeId, null)).isEqualTo(TreeAccessRole.NONE);

        holder.set(AuthContext.anonymous());
        assertThat(service.classifyTreeAccess(treeId, null)).isEqualTo(TreeAccessRole.NONE);
    }

    @Test
    void classifiesAuthenticatedShareTokenAccessAsReader() {
        UUID treeId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Tree tree = new Tree(UUID.randomUUID());
        tree.setSharing("link");
        holder.set(AuthContext.authenticated(userId, null));
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));
        when(shareTokenService.resolveTreeId("link-token")).thenReturn(Optional.of(treeId));

        assertThat(service.classifyTreeAccess(treeId, "link-token"))
                .isEqualTo(TreeAccessRole.READER);
        assertThat(service.classify(treeId, null)).isEqualTo(Role.NEITHER);
    }
}
