package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.platform.idempotency.IdempotencyRecord;
import com.caygiapha.familytree.platform.idempotency.IdempotencyService;
import com.caygiapha.familytree.security.AuthContextHolder;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.service.RelationshipService;
import com.caygiapha.familytree.service.RelationshipService.CreateRelationshipCommand;
import com.caygiapha.familytree.service.RelationshipService.RelationshipMutationResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
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
    private final IdempotencyService idempotencyService;
    private final AuthContextHolder authContextHolder;
    private final ObjectMapper objectMapper;

    public RelationshipController(
            RelationshipService relationshipService,
            AuthorizationService authorizationService,
            IdempotencyService idempotencyService,
            AuthContextHolder authContextHolder,
            ObjectMapper objectMapper) {
        this.relationshipService = relationshipService;
        this.authorizationService = authorizationService;
        this.idempotencyService = idempotencyService;
        this.authContextHolder = authContextHolder;
        this.objectMapper = objectMapper;
    }

    /**
     * Create a typed relationship edge. Returns {@code 201 Created} with the stored edge; structural
     * violations surface through the global error envelope with their declared HTTP status.
     */
    @PostMapping("/relationships")
    public ResponseEntity<RelationshipResponse> create(
            @Valid @RequestBody CreateRelationshipRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        // 13.4 — owner/contributor may add edges; use request treeId after authorization.
        authorizationService.requireMutationPermitted(request.treeId(), null);
        UUID userId = authContextHolder.current().userId();
        String requestHash = IdempotencyService.sha256(stableHash(request));
        Optional<RelationshipResponse> replayed = replay(idempotencyKey, userId, requestHash);
        if (replayed.isPresent()) {
            return ResponseEntity.status(HttpStatus.CREATED).body(replayed.get());
        }
        CreateRelationshipCommand command = new CreateRelationshipCommand(
                request.treeId(),
                request.type(),
                request.sourceId(),
                request.targetId(),
                request.maritalStatus(),
                request.socialType(),
                request.assertedLabel());
        RelationshipMutationResult result = relationshipService.create(command);
        RelationshipResponse body = RelationshipResponse.from(result.edge(), result.conflicts());
        remember(idempotencyKey, userId, requestHash, body);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    private Optional<RelationshipResponse> replay(String key, UUID userId, String requestHash) {
        if (key == null || key.isBlank()) {
            return Optional.empty();
        }
        return idempotencyService.replay(key, userId, requestHash).map(this::readStored);
    }

    private void remember(String key, UUID userId, String requestHash, RelationshipResponse body) {
        if (key == null || key.isBlank()) {
            return;
        }
        try {
            idempotencyService.remember(
                    key, userId, requestHash, HttpStatus.CREATED.value(), objectMapper.writeValueAsString(body));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to store idempotent relationship response", ex);
        }
    }

    private RelationshipResponse readStored(IdempotencyRecord record) {
        try {
            return objectMapper.readValue(record.getResponseBody(), RelationshipResponse.class);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to replay stored relationship response", ex);
        }
    }

    private String stableHash(CreateRelationshipRequest request) {
        return request.treeId()
                + "|"
                + request.type()
                + "|"
                + request.sourceId()
                + "|"
                + request.targetId()
                + "|"
                + String.valueOf(request.maritalStatus())
                + "|"
                + String.valueOf(request.socialType())
                + "|"
                + String.valueOf(request.assertedLabel());
    }
}
