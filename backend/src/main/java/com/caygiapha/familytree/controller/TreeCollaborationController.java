package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.entity.CollaborationInvitation;
import com.caygiapha.familytree.entity.TreeCollaborator;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.service.TreeCollaborationService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
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

    public TreeCollaborationController(
            TreeCollaborationService collaborationService,
            AuthorizationService authorizationService) {
        this.collaborationService = collaborationService;
        this.authorizationService = authorizationService;
    }

    public record InviteRequest(String email) {}

    @PostMapping("/{treeId}/collaborators/invite")
    @ResponseStatus(HttpStatus.CREATED)
    public CollaborationInvitation invite(
            @PathVariable("treeId") UUID treeId,
            @RequestBody InviteRequest request) {
        UUID currentUserId = authorizationService.currentContext().userId();
        return collaborationService.invite(treeId, request.email(), currentUserId);
    }

    @GetMapping("/{treeId}/collaborators/pending")
    public List<CollaborationInvitation> getPending(
            @PathVariable("treeId") UUID treeId) {
        UUID currentUserId = authorizationService.currentContext().userId();
        return collaborationService.getPendingInvitations(treeId, currentUserId);
    }

    @PostMapping("/{treeId}/collaborators/approve/{inviteId}")
    public void approve(
            @PathVariable("treeId") UUID treeId,
            @PathVariable("inviteId") UUID inviteId) {
        UUID currentUserId = authorizationService.currentContext().userId();
        collaborationService.approveInvitation(treeId, inviteId, currentUserId);
    }

    @PostMapping("/{treeId}/collaborators/reject/{inviteId}")
    public void reject(
            @PathVariable("treeId") UUID treeId,
            @PathVariable("inviteId") UUID inviteId) {
        UUID currentUserId = authorizationService.currentContext().userId();
        collaborationService.rejectInvitation(treeId, inviteId, currentUserId);
    }

    @PostMapping("/collaborators/join")
    public TreeCollaborator join(@RequestParam("code") String code) {
        UUID currentUserId = authorizationService.currentContext().userId();
        return collaborationService.joinTree(code, currentUserId);
    }

    @GetMapping("/collaborators/invitations/{inviteId}")
    public CollaborationInvitation getInvitation(@PathVariable("inviteId") UUID inviteId) {
        return collaborationService.getInvitation(inviteId);
    }

    @PostMapping("/collaborators/join-link")
    public TreeCollaborator joinWithLink(@RequestParam("inviteId") UUID inviteId) {
        UUID currentUserId = authorizationService.currentContext().userId();
        return collaborationService.joinTreeWithLink(inviteId, currentUserId);
    }

    @GetMapping("/{treeId}/collaborators")
    public List<TreeCollaborator> getCollaborators(@PathVariable("treeId") UUID treeId) {
        // Enforce reader permissions
        authorizationService.requireAuthenticatedViewer();
        return collaborationService.getCollaborators(treeId);
    }
}
