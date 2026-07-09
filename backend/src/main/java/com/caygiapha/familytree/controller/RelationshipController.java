package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.service.RelationshipService;
import com.caygiapha.familytree.service.RelationshipService.CreateRelationshipCommand;
import com.caygiapha.familytree.service.RelationshipService.RelationshipMutationResult;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Graph_Store relationship endpoint. Creates a typed edge (bloodline / marriage / non-bloodline /
 * asserted) with all structural constraints enforced by {@link RelationshipService}.
 * (Requirements 4.x, 5.5, 6.1, 6.2, 12.1, 12.2)
 *
 * <p>Edge creation is an owner-only mutation: the acting tree is derived from the authenticated
 * owner's session (Requirements 13.4, 13.5) rather than trusting the request-body {@code treeId},
 * which is retained only as a transitional placeholder.
 */
@RestController
@RequestMapping("/api/v1")
public class RelationshipController {

    private final RelationshipService relationshipService;
    private final AuthorizationService authorizationService;

    public RelationshipController(
            RelationshipService relationshipService, AuthorizationService authorizationService) {
        this.relationshipService = relationshipService;
        this.authorizationService = authorizationService;
    }

    /**
     * Create a typed relationship edge. Returns {@code 201 Created} with the stored edge; structural
     * violations surface through the global error envelope with their declared HTTP status.
     */
    @PostMapping("/relationships")
    public ResponseEntity<RelationshipResponse> create(
            @Valid @RequestBody CreateRelationshipRequest request) {
        // 13.4 — owner/contributor may add edges; use request treeId after authorization.
        authorizationService.requireMutationPermitted(request.treeId(), null);
        CreateRelationshipCommand command = new CreateRelationshipCommand(
                request.treeId(),
                request.type(),
                request.sourceId(),
                request.targetId(),
                request.maritalStatus(),
                request.socialType(),
                request.assertedLabel());
        RelationshipMutationResult result = relationshipService.create(command);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(RelationshipResponse.from(result.edge(), result.conflicts()));
    }
}
