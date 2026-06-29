package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.CollaborationInvitation;
import com.caygiapha.familytree.entity.TreeCollaborator;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.CollaborationInvitationRepository;
import com.caygiapha.familytree.repository.TreeCollaboratorRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service handling family tree co-editing invitations and contributor management.
 */
@Service
public class TreeCollaborationService {

    private static final int CODE_LENGTH = 6;
    private static final long EXPIRY_SECONDS = 7 * 24 * 3600; // 7 days

    private final TreeCollaboratorRepository collaboratorRepository;
    private final CollaborationInvitationRepository invitationRepository;
    private final TreeRepository treeRepository;
    private final UserRepository userRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public TreeCollaborationService(
            TreeCollaboratorRepository collaboratorRepository,
            CollaborationInvitationRepository invitationRepository,
            TreeRepository treeRepository,
            UserRepository userRepository) {
        this.collaboratorRepository = collaboratorRepository;
        this.invitationRepository = invitationRepository;
        this.treeRepository = treeRepository;
        this.userRepository = userRepository;
    }

    /** Invite a user by email to co-build the tree. */
    @Transactional
    public CollaborationInvitation invite(UUID treeId, String email, UUID inviterId) {
        // Enforce inviter has tree access
        boolean isOwner = treeRepository.findById(treeId)
                .map(t -> t.getOwnerUserId().equals(inviterId))
                .orElse(false);
        boolean isContributor = collaboratorRepository.existsByTreeIdAndUserId(treeId, inviterId);

        if (!isOwner && !isContributor) {
            throw ApiException.notAuthorized("You must be an owner or contributor of this tree to send invites.");
        }

        // Generate 6-digit random code
        String code = generateRandomCode();
        Instant expiresAt = Instant.now().plusSeconds(EXPIRY_SECONDS);

        CollaborationInvitation invitation = new CollaborationInvitation(
                treeId, inviterId, email, code, expiresAt);

        if (isOwner) {
            invitation.setStatus("sent");
        } else {
            invitation.setStatus("pending"); // requires owner approval
        }

        return invitationRepository.save(invitation);
    }

    /** List pending invites requiring owner approval. */
    @Transactional(readOnly = true)
    public List<CollaborationInvitation> getPendingInvitations(UUID treeId, UUID ownerId) {
        requireTreeOwner(treeId, ownerId);
        return invitationRepository.findByTreeIdAndStatus(treeId, "pending");
    }

    /** Approve a contributor-initiated invite. */
    @Transactional
    public void approveInvitation(UUID treeId, UUID invitationId, UUID ownerId) {
        requireTreeOwner(treeId, ownerId);
        CollaborationInvitation invite = invitationRepository.findById(invitationId)
                .orElseThrow(() -> ApiException.validation("invitationId", "Invitation not found."));
        if (!invite.getTreeId().equals(treeId)) {
            throw ApiException.validation("invitationId", "Invitation does not match tree.");
        }
        invite.setStatus("sent");
        invitationRepository.save(invite);
    }

    /** Reject/Cancel an invite. */
    @Transactional
    public void rejectInvitation(UUID treeId, UUID invitationId, UUID ownerId) {
        requireTreeOwner(treeId, ownerId);
        CollaborationInvitation invite = invitationRepository.findById(invitationId)
                .orElseThrow(() -> ApiException.validation("invitationId", "Invitation not found."));
        if (!invite.getTreeId().equals(treeId)) {
            throw ApiException.validation("invitationId", "Invitation does not match tree.");
        }
        invite.setStatus("rejected");
        invitationRepository.save(invite);
    }

    /** Join a tree co-building group using an invitation code. */
    @Transactional
    public TreeCollaborator joinTree(String code, UUID userId) {
        CollaborationInvitation invite = invitationRepository.findByCode(code)
                .orElseThrow(() -> ApiException.validation("code", "Mã mời không chính xác hoặc đã hết hạn."));

        if (!invite.getStatus().equals("sent")) {
            throw ApiException.validation("code", "Lời mời này đã được sử dụng hoặc chưa được duyệt.");
        }

        if (invite.isExpired()) {
            invite.setStatus("expired");
            invitationRepository.save(invite);
            throw ApiException.validation("code", "Mã mời đã hết hạn sử dụng.");
        }

        // Add user as a collaborator
        TreeCollaborator collaborator = new TreeCollaborator(invite.getTreeId(), userId, "contributor");
        TreeCollaborator saved = collaboratorRepository.save(collaborator);

        // Update invite status
        invite.setStatus("joined");
        invitationRepository.save(invite);

        return saved;
    }

    /** List all active collaborators (owner is listed first). */
    @Transactional(readOnly = true)
    public List<TreeCollaborator> getCollaborators(UUID treeId) {
        return collaboratorRepository.findByTreeId(treeId);
    }

    /** Check if user is a collaborator (contributor). */
    public boolean hasContributorAccess(UUID treeId, UUID userId) {
        return collaboratorRepository.existsByTreeIdAndUserId(treeId, userId);
    }

    private void requireTreeOwner(UUID treeId, UUID ownerId) {
        boolean isOwner = treeRepository.findById(treeId)
                .map(t -> t.getOwnerUserId().equals(ownerId))
                .orElse(false);
        if (!isOwner) {
            throw ApiException.notAuthorized("Chỉ chủ cây gia phả mới có thể thực hiện thao tác này.");
        }
    }

    private String generateRandomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(secureRandom.nextInt(10));
        }
        return sb.toString();
    }
}
