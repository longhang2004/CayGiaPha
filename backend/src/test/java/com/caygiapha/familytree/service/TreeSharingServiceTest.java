package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthContextHolder;
import com.caygiapha.familytree.security.AuthorizationService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link TreeSharingService}, the owner-only tree sharing controls (Requirements
 * 19.1, 19.5, 19.8):
 *
 * <ul>
 *   <li>a valid sharing mode from the owner is accepted and persisted (19.1);</li>
 *   <li>an invalid mode is rejected with a field-level error and the previous mode retained;</li>
 *   <li>a non-owner caller is rejected for every operation and nothing is read or written
 *       (19.8);</li>
 *   <li>issuing/revoking a share token is owner-gated and delegates to {@link ShareTokenService}.</li>
 * </ul>
 */
class TreeSharingServiceTest {

    private final AuthContextHolder holder = new AuthContextHolder();
    private final ClaimService claimService = mock(ClaimService.class);
    private final AuthorizationService authorizationService =
            new AuthorizationService(
                    holder, claimService, mock(TreeRepository.class), mock(ShareTokenService.class),
                    mock(ConsentService.class));
    private final TreeRepository treeRepository = mock(TreeRepository.class);
    private final ShareTokenService shareTokenService = mock(ShareTokenService.class);
    private final TreeSharingService service =
            new TreeSharingService(treeRepository, authorizationService, shareTokenService);

    @AfterEach
    void tearDown() {
        holder.clear();
    }

    @Test
    void ownerCanChangeToEachValidSharingMode() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        Tree tree = new Tree(userId);
        assertThat(tree.getSharing()).isEqualTo(Tree.DEFAULT_SHARING); // 'private' default (19.1)

        holder.set(AuthContext.authenticated(userId, treeId));
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));
        when(treeRepository.save(any(Tree.class))).thenAnswer(inv -> inv.getArgument(0));

        for (String mode : Tree.VALID_SHARING) { // {private, link, public}
            assertThat(service.changeSharing(treeId, mode).getSharing()).isEqualTo(mode);
        }
    }

    @Test
    void invalidSharingModeIsRejectedAndPreviousModeRetained() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        Tree tree = new Tree(userId);
        tree.setSharing("link");
        holder.set(AuthContext.authenticated(userId, treeId));
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));

        assertThatThrownBy(() -> service.changeSharing(treeId, "everyone"))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("sharing");
                });

        assertThat(tree.getSharing()).isEqualTo("link"); // retained
        verify(treeRepository, never()).save(any(Tree.class));
    }

    @Test
    void nonOwnerCannotChangeSharingAndNothingIsReadOrWritten() {
        UUID otherUser = UUID.randomUUID();
        UUID ownTree = UUID.randomUUID();
        UUID targetTree = UUID.randomUUID();
        holder.set(AuthContext.authenticated(otherUser, ownTree));

        assertThatThrownBy(() -> service.changeSharing(targetTree, "public"))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED)); // 19.8

        verify(treeRepository, never()).findById(any(UUID.class));
        verify(treeRepository, never()).save(any(Tree.class));
    }

    @Test
    void ownerCanIssueAndRevokeShareToken() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        holder.set(AuthContext.authenticated(userId, treeId));
        when(treeRepository.existsById(treeId)).thenReturn(true);
        when(shareTokenService.issueToken(treeId)).thenReturn("plaintext-token");

        assertThat(service.issueShareToken(treeId)).isEqualTo("plaintext-token"); // 19.5
        verify(shareTokenService).issueToken(treeId);

        service.revokeShareToken(treeId);
        verify(shareTokenService).revokeToken(treeId);
    }

    @Test
    void nonOwnerCannotIssueOrRevokeShareToken() {
        UUID otherUser = UUID.randomUUID();
        UUID ownTree = UUID.randomUUID();
        UUID targetTree = UUID.randomUUID();
        holder.set(AuthContext.authenticated(otherUser, ownTree));

        assertThatThrownBy(() -> service.issueShareToken(targetTree))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
        assertThatThrownBy(() -> service.revokeShareToken(targetTree))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));

        verify(shareTokenService, never()).issueToken(any(UUID.class));
        verify(shareTokenService, never()).revokeToken(any(UUID.class));
    }
}
