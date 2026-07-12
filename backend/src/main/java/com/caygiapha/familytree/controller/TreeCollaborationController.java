package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.entity.CollaborationInvitation;
import com.caygiapha.familytree.entity.TreeCollaborator;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.service.RateLimiter;
import com.caygiapha.familytree.service.TreeCollaborationService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trees")
public class TreeCollaborationController {

    private final TreeCollaborationService collaborationService;
    private final AuthorizationService authorizationService;
    private final RateLimiter rateLimiter;

    public TreeCollaborationController(
            TreeCollaborationService collaborationService,
            AuthorizationService authorizationService,
            RateLimiter rateLimiter) {
        this.collaborationService = collaborationService;
        this.authorizationService = authorizationService;
        this.rateLimiter = rateLimiter;
    }

    public record InviteRequest(String email) {}

    /** Safe invitation view for join-link UI — never includes the raw invite code. */
    public record InvitationView(
            UUID id,
            UUID treeId,
            String email,
            String status,
            java.time.Instant expiresAt) {
        static InvitationView from(CollaborationInvitation invite) {
            return new InvitationView(
                    invite.getId(),
                    invite.getTreeId(),
                    invite.getEmail(),
                    invite.getStatus(),
                    invite.getExpiresAt());
        }
    }

    public record InviteResponse(
            UUID id,
            UUID treeId,
            UUID inviterUserId,
            String email,
            String code,
            String status,
            java.time.Instant expiresAt,
            boolean emailSent,
            String emailMessage) {}

    @PostMapping("/{treeId}/collaborators/invite")
    @ResponseStatus(HttpStatus.CREATED)
    public InviteResponse invite(
            @PathVariable("treeId") UUID treeId,
            @RequestBody InviteRequest request) {
        AuthContext auth = authorizationService.requireAuthenticatedViewer();
        TreeCollaborationService.InviteResult result =
                collaborationService.invite(treeId, request.email(), auth.userId());
        CollaborationInvitation inv = result.invitation();
        return new InviteResponse(
                inv.getId(),
                inv.getTreeId(),
                inv.getInviterUserId(),
                inv.getEmail(),
                inv.getCode(),
                inv.getStatus(),
                inv.getExpiresAt(),
                result.emailSent(),
                result.emailMessage());
    }

    @PostMapping("/{treeId}/collaborators/invite-link")
    @ResponseStatus(HttpStatus.CREATED)
    public CollaborationInvitation createGenericInvite(
            @PathVariable("treeId") UUID treeId) {
        AuthContext auth = authorizationService.requireAuthenticatedViewer();
        return collaborationService.createGenericInvite(treeId, auth.userId());
    }

    @GetMapping("/{treeId}/collaborators/pending")
    public List<CollaborationInvitation> getPending(
            @PathVariable("treeId") UUID treeId) {
        AuthContext auth = authorizationService.requireAuthenticatedViewer();
        return collaborationService.getPendingInvitations(treeId, auth.userId());
    }

    @PostMapping("/{treeId}/collaborators/approve/{inviteId}")
    public void approve(
            @PathVariable("treeId") UUID treeId,
            @PathVariable("inviteId") UUID inviteId) {
        AuthContext auth = authorizationService.requireAuthenticatedViewer();
        collaborationService.approveInvitation(treeId, inviteId, auth.userId());
    }

    @PostMapping("/{treeId}/collaborators/reject/{inviteId}")
    public void reject(
            @PathVariable("treeId") UUID treeId,
            @PathVariable("inviteId") UUID inviteId) {
        AuthContext auth = authorizationService.requireAuthenticatedViewer();
        collaborationService.rejectInvitation(treeId, inviteId, auth.userId());
    }

    @PostMapping("/collaborators/join")
    public ResponseEntity<?> join(
            @RequestParam("code") String code, HttpServletRequest http) {
        AuthContext auth = authorizationService.requireAuthenticatedViewer();
        rateLimiter.check("collab-join:" + auth.userId());
        rateLimiter.check("collab-join-ip:" + http.getRemoteAddr());
        Object result = collaborationService.joinTree(code, auth.userId());
        if (result instanceof CollaborationInvitation) {
            return ResponseEntity.accepted().body(result);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/collaborators/invitations/{inviteId}")
    public InvitationView getInvitation(@PathVariable("inviteId") UUID inviteId) {
        // Authenticated only; never return the raw invite code (prevents IDOR code leak).
        // Detail is limited to owner of the tree or the invited email account.
        AuthContext auth = authorizationService.requireAuthenticatedViewer();
        CollaborationInvitation invite = collaborationService.getInvitation(inviteId);
        collaborationService.requireCanViewInvitation(invite, auth.userId());
        return InvitationView.from(invite);
    }

    @PostMapping("/collaborators/join-link")
    public ResponseEntity<?> joinWithLink(
            @RequestParam("inviteId") UUID inviteId, HttpServletRequest http) {
        AuthContext auth = authorizationService.requireAuthenticatedViewer();
        rateLimiter.check("collab-join:" + auth.userId());
        rateLimiter.check("collab-join-ip:" + http.getRemoteAddr());
        Object result = collaborationService.joinTreeWithLink(inviteId, auth.userId());
        if (result instanceof CollaborationInvitation) {
            return ResponseEntity.accepted().body(result);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{treeId}/collaborators")
    public List<TreeCollaborationService.CollaboratorView> getCollaborators(
            @PathVariable("treeId") UUID treeId,
            @org.springframework.web.bind.annotation.RequestHeader(
                            value = "X-Share-Token", required = false)
                    String shareToken) {
        authorizationService.requireReadAccess(treeId, shareToken);
        return collaborationService.getCollaboratorViews(treeId);
    }
}
