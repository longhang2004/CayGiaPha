package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.dto.ClaimResponse;
import com.caygiapha.familytree.dto.ClaimVerifyRequest;
import com.caygiapha.familytree.dto.InviteRequest;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.service.ClaimService;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Verification_Service node-claiming endpoints (Requirements 11.1, 11.2, 11.3, 11.7):
 *
 * <ul>
 *   <li>{@code POST /api/v1/persons/{personId}/invite} — an Owner invites a phone/email to claim an
 *       unclaimed node; a 15-minute claim code is issued (11.1, 11.7).</li>
 *   <li>{@code POST /api/v1/persons/{personId}/claim/verify} — an invited recipient submits the code
 *       and their identifier to claim the node (11.2–11.5).</li>
 * </ul>
 *
 * <p>Inviting is an owner-only mutation: the acting tree is derived from the authenticated owner's
 * session (Requirements 13.4, 11.6) rather than the request-body {@code treeId}. Claim verification
 * is part of the minimized unauthenticated surface (design Security Considerations) and is therefore
 * not gated by session ownership here; validation, already-claimed rejection, and verification
 * handling live in {@link ClaimService} and surface through the global error envelope.
 */
@RestController
@RequestMapping("/api/v1/persons/{personId}")
public class ClaimController {

    private final ClaimService claimService;
    private final AuthorizationService authorizationService;

    public ClaimController(
            ClaimService claimService, AuthorizationService authorizationService) {
        this.claimService = claimService;
        this.authorizationService = authorizationService;
    }

    @PostMapping("/invite")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void invite(
            @PathVariable("personId") UUID personId, @RequestBody InviteRequest request) {
        // 13.4 / 11.1 — only the authenticated owner may invite; scope to their tree.
        UUID treeId = authorizationService.requireOwnedTreeId();
        claimService.invite(treeId, personId, request.destination());
    }

    @PostMapping("/claim/verify")
    public ClaimResponse verifyClaim(
            @PathVariable("personId") UUID personId, @RequestBody ClaimVerifyRequest request) {
        return ClaimResponse.from(
                claimService.verifyClaim(
                        request.treeId(), personId, request.identifier(), request.code()));
    }
}
