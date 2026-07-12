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
import java.util.Optional;
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
        this.appUrl =
                appUrl == null || appUrl.isBlank() ? "http://localhost:3000" : appUrl.replaceAll("/$", "");
    }

    /** Result of creating an email invite, including delivery status for the UI. */
    public record InviteResult(
            CollaborationInvitation invitation, boolean emailSent, String emailMessage) {}

    /** Invite a user by email to co-build the tree. */
    @Transactional
    public InviteResult invite(UUID treeId, String email, UUID inviterId) {
        boolean isOwner = treeRepository
                .findById(treeId)
                .map(t -> t.getOwnerUserId().equals(inviterId))
                .orElse(false);
        boolean isContributor = collaboratorRepository.existsByTreeIdAndUserId(treeId, inviterId);

        if (!isOwner && !isContributor) {
            throw ApiException.notAuthorized(
                    "You must be an owner or contributor of this tree to send invites.");
        }

        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (normalizedEmail.isBlank() || !normalizedEmail.contains("@")) {
            throw ApiException.validation("email", "Email là bắt buộc.");
        }

        String code = generateRandomCode();
        Instant expiresAt = Instant.now().plusSeconds(EXPIRY_SECONDS);

        CollaborationInvitation invitation =
                new CollaborationInvitation(treeId, inviterId, normalizedEmail, code, expiresAt);
        // Direct email invitations are pre-approved.
        invitation.setStatus("approved");

        CollaborationInvitation saved = invitationRepository.save(invitation);
        EmailDelivery delivery = sendInviteEmail(treeId, saved);
        return new InviteResult(saved, delivery.sent(), delivery.message());
    }

    /** Create a generic invitation code (no email tied). */
    @Transactional
    public CollaborationInvitation createGenericInvite(UUID treeId, UUID inviterId) {
        requireTreeOwner(treeId, inviterId);
        String code = generateRandomCode();
        Instant expiresAt = Instant.now().plusSeconds(EXPIRY_SECONDS);

        CollaborationInvitation invitation =
                new CollaborationInvitation(treeId, inviterId, null, code, expiresAt);
        invitation.setStatus("generic");
        return invitationRepository.save(invitation);
    }

    /** List pending invites requiring owner approval. */
    @Transactional(readOnly = true)
    public List<CollaborationInvitation> getPendingInvitations(UUID treeId, UUID ownerId) {
        requireTreeOwner(treeId, ownerId);
        return invitationRepository.findByTreeIdAndStatus(treeId, "pending");
    }

    /**
     * Approve a pending join request only. Prefer {@code requester_user_id}; fall back to email match
     * for older rows. Direct email invites stay {@code approved} until the invitee accepts.
     */
    @Transactional
    public void approveInvitation(UUID treeId, UUID invitationId, UUID ownerId) {
        requireTreeOwner(treeId, ownerId);
        CollaborationInvitation invite = invitationRepository
                .findById(invitationId)
                .orElseThrow(() -> ApiException.validation("invitationId", "Invitation not found."));
        if (!invite.getTreeId().equals(treeId)) {
            throw ApiException.validation("invitationId", "Invitation does not match tree.");
        }
        if (!"pending".equals(invite.getStatus())) {
            throw ApiException.validation("invitationId", "Chỉ có thể duyệt yêu cầu đang chờ (pending).");
        }
        if (invite.isExpired()) {
            invite.setStatus("expired");
            invitationRepository.save(invite);
            throw ApiException.validation("invitationId", "Yêu cầu tham gia đã hết hạn.");
        }

        UUID targetUserId = invite.getRequesterUserId();
        if (targetUserId == null) {
            targetUserId = resolveUserIdForInviteEmail(invite.getEmail()).orElse(null);
        }
        if (targetUserId != null) {
            ensureCollaborator(treeId, targetUserId);
            invite.setStatus("joined");
        } else {
            // No resolvable user yet — leave approved for later accept via link/code.
            invite.setStatus("approved");
        }
        invitationRepository.save(invite);
    }

    /** Reject/Cancel an invite. */
    @Transactional
    public void rejectInvitation(UUID treeId, UUID invitationId, UUID ownerId) {
        requireTreeOwner(treeId, ownerId);
        CollaborationInvitation invite = invitationRepository
                .findById(invitationId)
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
        String normalized = code == null ? "" : code.trim().toLowerCase(Locale.ROOT);
        CollaborationInvitation invite = invitationRepository
                .findByCodeIgnoreCase(normalized)
                .or(() -> invitationRepository.findByCode(normalized))
                .orElseThrow(() ->
                        ApiException.validation("code", "Mã mời không chính xác hoặc đã hết hạn."));

        return acceptInvite(invite, userId, "code");
    }

    /** List all active collaborators. */
    @Transactional(readOnly = true)
    public List<TreeCollaborator> getCollaborators(UUID treeId) {
        return collaboratorRepository.findByTreeId(treeId);
    }

    public record CollaboratorView(
            UUID id,
            UUID treeId,
            UUID userId,
            String displayName,
            String email,
            String role,
            java.time.Instant joinedAt) {}

    @Transactional(readOnly = true)
    public List<CollaboratorView> getCollaboratorViews(UUID treeId) {
        return collaboratorRepository.findByTreeId(treeId).stream().map(c -> {
            var user = userRepository.findById(c.getUserId()).orElse(null);
            return new CollaboratorView(
                    c.getId(),
                    c.getTreeId(),
                    c.getUserId(),
                    user != null ? user.getDisplayName() : null,
                    user != null ? user.getEmail() : null,
                    c.getRole(),
                    c.getJoinedAt());
        }).toList();
    }

    public boolean hasContributorAccess(UUID treeId, UUID userId) {
        return collaboratorRepository.existsByTreeIdAndUserId(treeId, userId);
    }

    @Transactional(readOnly = true)
    public CollaborationInvitation getInvitation(UUID invitationId) {
        return invitationRepository
                .findById(invitationId)
                .orElseThrow(() -> ApiException.validation("invitationId", "Lời mời không tồn tại."));
    }

    /**
     * The tree owner, invite creator, invited email account, or pending requester may view invite
     * details. Other authenticated users are denied.
     */
    @Transactional(readOnly = true)
    public void requireCanViewInvitation(CollaborationInvitation invite, UUID userId) {
        boolean owner = treeRepository
                .findById(invite.getTreeId())
                .map(t -> t.getOwnerUserId().equals(userId))
                .orElse(false);
        if (owner) {
            return;
        }
        if (invite.getInviterUserId().equals(userId)) {
            return;
        }
        if (invite.getRequesterUserId() != null && invite.getRequesterUserId().equals(userId)) {
            return;
        }
        if (invite.getEmail() != null && !invite.getEmail().isBlank()) {
            String userEmail = userRepository
                    .findById(userId)
                    .map(u -> u.getEmail() == null ? "" : u.getEmail().trim().toLowerCase(Locale.ROOT))
                    .orElse("");
            if (userEmail.equals(invite.getEmail().trim().toLowerCase(Locale.ROOT))) {
                return;
            }
        }
        throw ApiException.notAuthorized("Bạn không có quyền xem lời mời này.");
    }

    @Transactional
    public Object joinTreeWithLink(UUID invitationId, UUID userId) {
        CollaborationInvitation invite = invitationRepository
                .findById(invitationId)
                .orElseThrow(() -> ApiException.validation("invitationId", "Lời mời không tồn tại."));
        return acceptInvite(invite, userId, "invitationId");
    }

    private Object acceptInvite(CollaborationInvitation invite, UUID userId, String field) {
        if ("pending".equals(invite.getStatus())) {
            throw ApiException.validation(field, "Yêu cầu tham gia đang chờ chủ cây duyệt.");
        }
        if ("rejected".equals(invite.getStatus()) || "expired".equals(invite.getStatus())) {
            throw ApiException.validation(field, "Lời mời này đã được sử dụng hoặc không hợp lệ.");
        }

        if (invite.isExpired()) {
            invite.setStatus("expired");
            invitationRepository.save(invite);
            throw ApiException.validation(field, "Lời mời đã hết hạn sử dụng.");
        }

        // Email-bound invites: verify recipient BEFORE idempotency so a wrong account that is
        // already a collaborator cannot mark the invite joined for the real invitee.
        if (invite.getEmail() != null
                && !invite.getEmail().isBlank()
                && !"generic".equals(invite.getStatus())) {
            String userEmail = userRepository
                    .findById(userId)
                    .map(u -> u.getEmail() == null ? "" : u.getEmail().trim().toLowerCase(Locale.ROOT))
                    .orElse("");
            if (!userEmail.equals(invite.getEmail().trim().toLowerCase(Locale.ROOT))) {
                throw ApiException.validation(
                        field, "Lời mời này dành cho email khác. Hãy đăng nhập đúng tài khoản được mời.");
            }
        }

        // Idempotent only for the rightful invitee (or unbound invites).
        Optional<TreeCollaborator> existing =
                collaboratorRepository.findByTreeIdAndUserId(invite.getTreeId(), userId);
        if (existing.isPresent()) {
            if ("approved".equals(invite.getStatus())) {
                invite.setStatus("joined");
                invitationRepository.save(invite);
            }
            return existing.get();
        }

        if ("joined".equals(invite.getStatus())) {
            throw ApiException.validation(field, "Lời mời này đã được sử dụng.");
        }

        if ("generic".equals(invite.getStatus())) {
            // Dedupe: one pending request per (tree, requester).
            Optional<CollaborationInvitation> existingPending = invitationRepository
                    .findByTreeIdAndRequesterUserIdAndStatus(invite.getTreeId(), userId, "pending");
            if (existingPending.isPresent()) {
                return existingPending.get();
            }
            String userEmail = userRepository
                    .findById(userId)
                    .map(u -> u.getEmail() != null ? u.getEmail() : u.getPhone())
                    .orElse(null);
            CollaborationInvitation pendingReq = new CollaborationInvitation(
                    invite.getTreeId(),
                    invite.getInviterUserId(),
                    userEmail,
                    generateRandomCode(),
                    invite.getExpiresAt());
            pendingReq.setStatus("pending");
            pendingReq.setRequesterUserId(userId);
            return invitationRepository.save(pendingReq);
        }

        if (!"approved".equals(invite.getStatus())) {
            throw ApiException.validation(field, "Lời mời này đã được sử dụng hoặc không hợp lệ.");
        }

        TreeCollaborator saved = ensureCollaborator(invite.getTreeId(), userId);
        invite.setStatus("joined");
        invitationRepository.save(invite);
        return saved;
    }

    private TreeCollaborator ensureCollaborator(UUID treeId, UUID userId) {
        return collaboratorRepository
                .findByTreeIdAndUserId(treeId, userId)
                .orElseGet(() -> collaboratorRepository.save(
                        new TreeCollaborator(treeId, userId, "contributor")));
    }

    private Optional<UUID> resolveUserIdForInviteEmail(String email) {
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }
        return userRepository
                .findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .map(u -> u.getId());
    }

    private void requireTreeOwner(UUID treeId, UUID ownerId) {
        boolean isOwner = treeRepository
                .findById(treeId)
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

    private record EmailDelivery(boolean sent, String message) {}

    private EmailDelivery sendInviteEmail(UUID treeId, CollaborationInvitation invite) {
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

        if (!emailService.canDeliverServerSide()) {
            log.info("Collaboration invite created; server-side email skipped (frontend will deliver).");
            return new EmailDelivery(
                    false, "Lời mời đã tạo. Đang gửi email từ frontend…");
        }
        try {
            emailService.sendHtml(invite.getEmail(), subject, text, html);
            return new EmailDelivery(
                    true,
                    "Đã gửi email tới " + invite.getEmail()
                            + ". Nhắc người nhận kiểm tra cả thư rác/spam.");
        } catch (RuntimeException ex) {
            log.warn("Collaboration invite email delivery failed.");
            return new EmailDelivery(
                    false,
                    "Lời mời đã tạo. Server không gửi được email — frontend sẽ thử lại.");
        }
    }
}
