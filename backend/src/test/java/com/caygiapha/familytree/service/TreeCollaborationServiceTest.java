package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.CollaborationInvitation;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.entity.TreeCollaborator;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.CollaborationInvitationRepository;
import com.caygiapha.familytree.repository.TreeCollaboratorRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TreeCollaborationServiceTest {

    private TreeCollaboratorRepository collaboratorRepository;
    private CollaborationInvitationRepository invitationRepository;
    private TreeRepository treeRepository;
    private UserRepository userRepository;
    private EmailService emailService;
    private TreeCollaborationService service;

    private final UUID treeId = UUID.randomUUID();
    private final UUID ownerId = UUID.randomUUID();
    private final UUID contributorId = UUID.randomUUID();
    private final UUID guestId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        collaboratorRepository = mock(TreeCollaboratorRepository.class);
        invitationRepository = mock(CollaborationInvitationRepository.class);
        treeRepository = mock(TreeRepository.class);
        userRepository = mock(UserRepository.class);
        emailService = mock(EmailService.class);
        service = new TreeCollaborationService(
                collaboratorRepository,
                invitationRepository,
                treeRepository,
                userRepository,
                emailService,
                "http://localhost:3000");

        Tree tree = new Tree(ownerId);
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
    }

    @Test
    void ownerCanInviteDirectly() {
        when(invitationRepository.save(any(CollaborationInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CollaborationInvitation invite = service.invite(treeId, "test@test.com", ownerId);
        assertThat(invite.getStatus()).isEqualTo("approved");
        assertThat(invite.getEmail()).isEqualTo("test@test.com");
        assertThat(invite.getCode()).hasSize(6);
    }

    @Test
    void contributorCanSendApprovedEmailInvite() {
        when(collaboratorRepository.existsByTreeIdAndUserId(treeId, contributorId)).thenReturn(true);
        when(invitationRepository.save(any(CollaborationInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CollaborationInvitation invite = service.invite(treeId, "test@test.com", contributorId);
        assertThat(invite.getStatus()).isEqualTo("approved");
    }

    @Test
    void unauthorizedUserCannotInvite() {
        assertThatThrownBy(() -> service.invite(treeId, "test@test.com", guestId))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void ownerCanApprovePendingInvitation() {
        CollaborationInvitation invite = new CollaborationInvitation(
                treeId, contributorId, "test@test.com", "123456", Instant.now().plusSeconds(3600));
        when(invitationRepository.findById(invite.getId())).thenReturn(Optional.of(invite));

        service.approveInvitation(treeId, invite.getId(), ownerId);
        assertThat(invite.getStatus()).isEqualTo("approved");
    }

    @Test
    void joinTreeWithValidCodeSuccess() {
        CollaborationInvitation invite = new CollaborationInvitation(
                treeId, ownerId, "test@test.com", "123456", Instant.now().plusSeconds(3600));
        invite.setStatus("approved");
        when(invitationRepository.findByCode("123456")).thenReturn(Optional.of(invite));
        when(collaboratorRepository.save(any(TreeCollaborator.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        TreeCollaborator collaborator = (TreeCollaborator) service.joinTree("123456", guestId);
        assertThat(collaborator.getTreeId()).isEqualTo(treeId);
        assertThat(collaborator.getUserId()).isEqualTo(guestId);
        assertThat(collaborator.getRole()).isEqualTo("contributor");
        assertThat(invite.getStatus()).isEqualTo("joined");
    }

    @Test
    void joinTreeWithExpiredCodeThrowsException() {
        CollaborationInvitation invite = new CollaborationInvitation(
                treeId, ownerId, "test@test.com", "123456", Instant.now().minusSeconds(3600));
        invite.setStatus("approved");
        when(invitationRepository.findByCode("123456")).thenReturn(Optional.of(invite));

        assertThatThrownBy(() -> service.joinTree("123456", guestId))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void joinTreeWithPendingCodeRequiresOwnerApproval() {
        CollaborationInvitation invite = new CollaborationInvitation(
                treeId, contributorId, "test@test.com", "123456", Instant.now().plusSeconds(3600));
        invite.setStatus("pending");
        when(invitationRepository.findByCode("123456")).thenReturn(Optional.of(invite));

        assertThatThrownBy(() -> service.joinTree("123456", guestId))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("đang chờ chủ cây duyệt");
    }
}
