package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.CollaborationInvitation;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.entity.TreeCollaborator;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.CollaborationInvitationRepository;
import com.caygiapha.familytree.repository.TreeCollaboratorRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service handling family tree co-editing invitations and contributor management.
 */
@Service
public class TreeCollaborationService {

    private static final Logger log = LoggerFactory.getLogger(TreeCollaborationService.class);

    /** 6-character invite codes (digits + lowercase letters, no ambiguous 0/o/1/l). */
    private static final int CODE_LENGTH = 6;
    private static final String CODE_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
    private static final long EXPIRY_SECONDS = 7 * 24 * 3600; // 7 days

    private final TreeCollaboratorRepository collaboratorRepository;
    private final CollaborationInvitationRepository invitationRepository;
    private final TreeRepository treeRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final String appUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public TreeCollaborationService(
            TreeCollaboratorRepository collaboratorRepository,
            CollaborationInvitationRepository invitationRepository,
            TreeRepository treeRepository,
            UserRepository userRepository,
            EmailService emailService,
            @Value("${app.app-url:http://localhost:3000}") String appUrl) {
        this.collaboratorRepository = collaboratorRepository;
        this.invitationRepository = invitationRepository;
        this.treeRepository = treeRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.appUrl = appUrl == null || appUrl.isBlank() ? "http://localhost:3000" : appUrl.replaceAll("/$", "");
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

        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (normalizedEmail.isBlank() || !normalizedEmail.contains("@")) {
            throw ApiException.validation("email", "Email là bắt buộc.");
        }

        String code = generateRandomCode();
        Instant expiresAt = Instant.now().plusSeconds(EXPIRY_SECONDS);

        CollaborationInvitation invitation = new CollaborationInvitation(
                treeId, inviterId, normalizedEmail, code, expiresAt);

        // Direct email invitations are pre-approved. Generic link/code join requests remain pending
        // until an owner approves them.
        invitation.setStatus("approved");

        CollaborationInvitation saved = invitationRepository.save(invitation);
        sendInviteEmail(treeId, saved);
        return saved;
    }

    /** Create a generic invitation code (no email tied). */
    @Transactional
    public CollaborationInvitation createGenericInvite(UUID treeId, UUID inviterId) {
        requireTreeOwner(treeId, inviterId);
        String code = generateRandomCode();
        Instant expiresAt = Instant.now().plusSeconds(EXPIRY_SECONDS);

        CollaborationInvitation invitation = new CollaborationInvitation(
                treeId, inviterId, null, code, expiresAt);
        invitation.setStatus("generic");
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
        invite.setStatus("approved");
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
    public Object joinTree(String code, UUID userId) {
        CollaborationInvitation invite = invitationRepository.findByCode(code)
                .orElseThrow(() -> ApiException.validation("code", "Mã mời không chính xác hoặc đã hết hạn."));

        if ("pending".equals(invite.getStatus())) {
            throw ApiException.validation("code", "Yêu cầu tham gia đang chờ chủ cây duyệt.");
        }

        if (!"approved".equals(invite.getStatus()) && !"generic".equals(invite.getStatus())) {
            throw ApiException.validation("code", "Lời mời này đã được sử dụng hoặc không hợp lệ.");
        }

        if (invite.isExpired()) {
            invite.setStatus("expired");
            invitationRepository.save(invite);
            throw ApiException.validation("code", "Mã mời đã hết hạn sử dụng.");
        }

        if ("generic".equals(invite.getStatus())) {
            String userEmail = userRepository.findById(userId)
                    .map(u -> u.getEmail() != null ? u.getEmail() : u.getPhone())
                    .orElse("Unknown");
            CollaborationInvitation pendingReq = new CollaborationInvitation(
                    invite.getTreeId(), invite.getInviterUserId(), userEmail, generateRandomCode(), invite.getExpiresAt());
            pendingReq.setStatus("pending");
            return invitationRepository.save(pendingReq);
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
            sb.append(CODE_CHARS.charAt(secureRandom.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }

    private void sendInviteEmail(UUID treeId, CollaborationInvitation invite) {
        Tree tree = treeRepository.findById(treeId).orElse(null);
        String treeName = tree != null && tree.getName() != null ? tree.getName() : "Cây Gia Phả";
        boolean registered = userRepository.findByEmail(invite.getEmail()).isPresent();
        String inviteUrl = registered
                ? appUrl + "/invitation/" + invite.getId()
                : appUrl + "/signup?redirect=/invitation/" + invite.getId();
        String buttonText = registered ? "Tham gia xây dựng cây" : "Đăng ký & Tham gia xây dựng cây";
        String description = registered
                ? "Tài khoản với email <strong>" + invite.getEmail()
                        + "</strong> đã có trên hệ thống. Hãy đăng nhập và nhấp nút dưới đây để chấp nhận lời mời:"
                : "Email <strong>" + invite.getEmail()
                        + "</strong> chưa đăng ký. Hãy nhấp nút dưới đây để đăng ký và tham gia cộng tác:";

        String subject = "Mời tham gia hợp tác xây dựng Cây Gia Phả \"" + treeName + "\"";
        String text = "Bạn được mời cộng tác cây \"" + treeName + "\". Mã mời: " + invite.getCode()
                + ". Link: " + inviteUrl + ". Nếu không thấy thư, hãy kiểm tra hộp thư rác/spam.";
        String html = """
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 8px;">
                  <h2 style="color: #b94b34; text-align: center;">Mời Hợp Tác Gia Phả</h2>
                  <p>Xin chào,</p>
                  <p>Bạn đã nhận được lời mời cộng tác xây dựng cây gia phả <strong>"%s"</strong>.</p>
                  <p>%s</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="%s" style="background-color: #b94b34; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">%s</a>
                  </div>
                  <p style="font-size: 0.9rem; color: #666; text-align: center;">
                    Mã mời của bạn là: <strong>%s</strong> (dùng khi tham gia thủ công)
                  </p>
                  <p style="font-size: 0.85rem; color: #888; text-align: center;">
                    Nếu không thấy email trong hộp thư chính, vui lòng kiểm tra mục <strong>Thư rác / Spam</strong>.
                  </p>
                </div>
                """.formatted(treeName, description, inviteUrl, buttonText, invite.getCode());

        try {
            emailService.sendHtml(invite.getEmail(), subject, text, html);
        } catch (RuntimeException ex) {
            // Invitation is already saved; surface a soft failure so the owner still gets the code.
            log.warn("Invite email failed for {}: {}", invite.getEmail(), ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public CollaborationInvitation getInvitation(UUID invitationId) {
        return invitationRepository.findById(invitationId)
                .orElseThrow(() -> ApiException.validation("invitationId", "Lời mời không tồn tại."));
    }

    @Transactional
    public Object joinTreeWithLink(UUID invitationId, UUID userId) {
        CollaborationInvitation invite = invitationRepository.findById(invitationId)
                .orElseThrow(() -> ApiException.validation("invitationId", "Lời mời không tồn tại."));

        if ("pending".equals(invite.getStatus())) {
            throw ApiException.validation("invitationId", "Yêu cầu tham gia đang chờ chủ cây duyệt.");
        }

        if (!"approved".equals(invite.getStatus()) && !"generic".equals(invite.getStatus())) {
            throw ApiException.validation("invitationId", "Lời mời này đã được sử dụng hoặc không hợp lệ.");
        }

        if (invite.isExpired()) {
            invite.setStatus("expired");
            invitationRepository.save(invite);
            throw ApiException.validation("invitationId", "Liên kết mời đã hết hạn sử dụng.");
        }

        if ("generic".equals(invite.getStatus())) {
            String userEmail = userRepository.findById(userId)
                    .map(u -> u.getEmail() != null ? u.getEmail() : u.getPhone())
                    .orElse("Unknown");
            CollaborationInvitation pendingReq = new CollaborationInvitation(
                    invite.getTreeId(), invite.getInviterUserId(), userEmail, generateRandomCode(), invite.getExpiresAt());
            pendingReq.setStatus("pending");
            return invitationRepository.save(pendingReq);
        }

        // Add user as a collaborator
        TreeCollaborator collaborator = new TreeCollaborator(invite.getTreeId(), userId, "contributor");
        TreeCollaborator saved = collaboratorRepository.save(collaborator);

        // Update invite status
        invite.setStatus("joined");
        invitationRepository.save(invite);

        return saved;
    }
}
