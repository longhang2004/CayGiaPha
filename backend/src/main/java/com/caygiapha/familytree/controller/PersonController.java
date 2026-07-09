package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.dto.CreatePersonRequest;
import com.caygiapha.familytree.dto.CreatedPersonResponse;
import com.caygiapha.familytree.dto.DeletePersonRequest;
import com.caygiapha.familytree.dto.DeletionChoiceResponse;
import com.caygiapha.familytree.dto.EditPersonRequest;
import com.caygiapha.familytree.dto.PersonResponse;
import com.caygiapha.familytree.dto.VisibilityUpdateRequest;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.security.AuthorizationService.Role;
import com.caygiapha.familytree.service.AuditService;
import com.caygiapha.familytree.service.LivingPersonPolicy;
import com.caygiapha.familytree.service.PersonDeletionService;
import com.caygiapha.familytree.service.PersonService;
import com.caygiapha.familytree.service.PhotoService;
import com.caygiapha.familytree.entity.Person;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Graph_Store person endpoints (Requirements 3.1, 3.2, 3.3, 3.5, 3.6, 3.7):
 *
 * <ul>
 *   <li>{@code POST   /api/v1/persons}                 create a person, returning the new node id.</li>
 *   <li>{@code PATCH  /api/v1/persons/{id}}            partial edit of person fields.</li>
 *   <li>{@code PATCH  /api/v1/persons/{id}/visibility} set per-field visibility (owner only).</li>
 *   <li>{@code GET    /api/v1/persons/{id}}            read a person with privacy filtering.</li>
 * </ul>
 *
 * <p>The owning tree is resolved from the authenticated session: create scopes the new node to the
 * caller's owned tree, and edit enforces the ownership / claimed-node authorization model
 * (Requirements 11.6, 13.4, 13.5) via {@link AuthorizationService} before delegating. Field-bound
 * validation and not-accessible handling live in {@link PersonService} and surface through the
 * global error envelope.
 *
 * <p>The {@code GET} read path applies the server-side privacy filter (Requirements 14.3-14.5):
 * the viewer's role is classified via {@link AuthorizationService}, and sensitive fields whose
 * visibility is {@code "private"} are projected only for the tree Owner or the linked
 * {@code Claimed_Node} user. The visibility setter is an owner-only mutation (Requirement 14 is a
 * tree-owner control).
 */
@RestController
@RequestMapping("/api/v1/persons")
public class PersonController {

    private final PersonService personService;
    private final PersonDeletionService personDeletionService;
    private final AuthorizationService authorizationService;
    private final TreeRepository treeRepository;
    private final LivingPersonPolicy livingPersonPolicy;
    private final AuditService auditService;
    private final PhotoService photoService;

    public PersonController(
            PersonService personService,
            PersonDeletionService personDeletionService,
            AuthorizationService authorizationService,
            TreeRepository treeRepository,
            LivingPersonPolicy livingPersonPolicy,
            AuditService auditService,
            PhotoService photoService) {
        this.personService = personService;
        this.personDeletionService = personDeletionService;
        this.authorizationService = authorizationService;
        this.treeRepository = treeRepository;
        this.livingPersonPolicy = livingPersonPolicy;
        this.auditService = auditService;
        this.photoService = photoService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreatedPersonResponse create(@RequestBody CreatePersonRequest request) {
        // 13.4 — owner/contributor may create; treeId comes from the request and is ownership-checked
        // so multi-tree accounts write into the intended tree.
        if (request.treeId() == null) {
            throw ApiException.validation("treeId", "Tree id is required.");
        }
        authorizationService.requireMutationPermitted(request.treeId(), null);
        UUID id = personService.create(request);
        return new CreatedPersonResponse(id);
    }

    @PatchMapping("/{id}")
    public PersonResponse edit(
            @PathVariable("id") UUID id,
            @RequestParam("treeId") UUID treeId,
            @RequestBody EditPersonRequest request) {
        // 11.6 / 13.4 / 13.5 — owner may edit any node in their tree; a linked user may edit their
        // own claimed node; everyone else is rejected leaving contents unchanged.
        authorizationService.requireMutationPermitted(treeId, id);
        // The edit caller just passed mutation authorization, so is a privileged viewer (14.3).
        return PersonResponse.forPrivilegedViewer(personService.edit(treeId, id, request));
    }

    @PatchMapping("/{id}/visibility")
    public PersonResponse setVisibility(
            @PathVariable("id") UUID id,
            @RequestParam("treeId") UUID treeId,
            @RequestBody VisibilityUpdateRequest request) {
        // 21.5 / 14.1 — the tree owner, or the linked user of a claimed node, may set its visibility.
        authorizationService.requireMutationPermitted(treeId, id);
        PersonResponse body =
                PersonResponse.forPrivilegedViewer(personService.setVisibility(treeId, id, request));
        auditService.record(AuditService.VISIBILITY_CHANGED, "person", id); // 25.2
        return body;
    }

    /**
     * Phase 1 of deletion (Requirements 3.4, 15.1, 15.2, 15.10): present the two-option deletion
     * choice for the target node and make no change to the Graph_Store. Deletion is an owner-only
     * operation (13.4); a target absent from the tree is rejected as not accessible.
     */
    @DeleteMapping("/{id}")
    public DeletionChoiceResponse beginDeletion(
            @PathVariable("id") UUID id, @RequestParam("treeId") UUID treeId) {
        // 13.4 — only the tree owner may delete a node (claimed-node linkage permits edits only).
        authorizationService.requireOwner(treeId);
        return personDeletionService.beginDeletion(treeId, id);
    }

    /**
     * Phase 2 of deletion (Requirements 15.3, 15.4, 15.10): execute the deletion with the Owner's
     * chosen strategy ({@code cascade} or {@code preserve}). Owner-only; a target absent from the
     * tree or an unknown strategy is rejected, leaving the Graph_Store unchanged.
     */
    @PostMapping("/{id}/delete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void execute(
            @PathVariable("id") UUID id,
            @RequestParam("treeId") UUID treeId,
            @RequestBody DeletePersonRequest request) {
        // 13.4 — deletion is owner-only.
        authorizationService.requireOwner(treeId);
        // 24.6 — remove the target node's photos from object storage before deleting the node
        // (the DB FK cascade removes the photo rows of any neighbor nodes the deletion also removes).
        photoService.deleteAllForPerson(id);
        personDeletionService.execute(treeId, id, request.strategy());
        auditService.record(AuditService.PERSON_DELETED, "person", id, request.strategy()); // 25.2
    }

    @GetMapping("/{id}")
    public ResponseEntity<PersonResponse> read(
            @PathVariable("id") UUID id,
            @RequestParam("treeId") UUID treeId,
            @RequestHeader(value = "X-Share-Token", required = false) String shareToken) {
        // 19.x — enforce tree-level read access before disclosing any node data; a denied read
        // returns a uniform NOT_AUTHORIZED that does not reveal whether the tree exists (19.7, 25.4).
        authorizationService.requireReadAccess(treeId, shareToken);
        // A viewer is privileged (sees private sensitive fields; 14.3) iff they are the tree owner
        // or the linked claimed-node user; otherwise the privacy filter applies (14.4, 14.5).
        boolean privileged = authorizationService.classify(treeId, id) != Role.NEITHER;
        Person person = personService.read(treeId, id);
        // 20.2 — for a non-privileged viewer, redact Living_Person details when the tree enables
        // living redaction (default on).
        boolean redactLiving = !privileged
                && treeRepository.findById(treeId).map(Tree::isLivingRedaction).orElse(true)
                && livingPersonPolicy.isLiving(person);
        return ResponseEntity.ok(
                PersonResponse.filteredFor(person, privileged, redactLiving));
    }
}
