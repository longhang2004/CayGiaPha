package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.dto.CreateTreeRequest;
import com.caygiapha.familytree.dto.LivingRedactionRequest;
import com.caygiapha.familytree.dto.LivingRedactionResponse;
import com.caygiapha.familytree.dto.RegionChangeRequest;
import com.caygiapha.familytree.dto.RegionChangeResponse;
import com.caygiapha.familytree.dto.SharingResponse;
import com.caygiapha.familytree.dto.SharingUpdateRequest;
import com.caygiapha.familytree.dto.ShareTokenResponse;
import com.caygiapha.familytree.dto.TreeDetailResponse;
import com.caygiapha.familytree.dto.TreeSummaryResponse;
import com.caygiapha.familytree.dto.UpcomingEventResponse;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.ClaimRepository;
import com.caygiapha.familytree.repository.CollaborationInvitationRepository;
import com.caygiapha.familytree.repository.InAppReminderRepository;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.PersonPhotoRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.repository.TreeCollaboratorRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.TreeShareTokenRepository;
import com.caygiapha.familytree.repository.VerificationCodeRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.security.AuthorizationService.Role;
import com.caygiapha.familytree.service.AuditService;
import com.caygiapha.familytree.service.EventService;
import com.caygiapha.familytree.service.LivingPersonPolicy;
import com.caygiapha.familytree.service.RateLimiter;
import com.caygiapha.familytree.service.TreeRegionService;
import com.caygiapha.familytree.service.TreeSharingService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
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
 * Tree-level configuration endpoints (Requirements 9.5, 9.6, 19.1, 19.5, 19.8):
 *
 * <ul>
 *   <li>{@code PATCH  /api/v1/trees/{treeId}/region}       — change the tree's default region;
 *       owner-only, {@code Bac}/{@code Trung}/{@code Nam} only, previous region retained on an
 *       invalid value.</li>
 *   <li>{@code PATCH  /api/v1/trees/{treeId}/sharing}      — set sharing private/link/public;
 *       owner-only. (19.1, 19.8)</li>
 *   <li>{@code POST   /api/v1/trees/{treeId}/share-token}  — issue a share token (revoking the
 *       prior one), returned once; owner-only. (19.5)</li>
 *   <li>{@code DELETE /api/v1/trees/{treeId}/share-token}  — revoke the active share token;
 *       owner-only. (19.5)</li>
 * </ul>
 *
 * <p>Authorization (owner-only) and value validation live in the services; rejections surface
 * through the global error envelope with their declared HTTP status.
 */
@RestController
@RequestMapping("/api/v1/trees")
public class TreeController {

    private final TreeRegionService treeRegionService;
    private final TreeSharingService treeSharingService;
    private final AuditService auditService;
    private final EventService eventService;
    private final AuthorizationService authorizationService;
    private final TreeRepository treeRepository;
    private final TreeCollaboratorRepository collaboratorRepository;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final ClaimRepository claimRepository;
    private final TreeShareTokenRepository treeShareTokenRepository;
    private final CollaborationInvitationRepository invitationRepository;
    private final VerificationCodeRepository verificationCodeRepository;
    private final PersonPhotoRepository photoRepository;
    private final InAppReminderRepository reminderRepository;
    private final LivingPersonPolicy livingPersonPolicy;
    private final RateLimiter rateLimiter;

    public TreeController(
            TreeRegionService treeRegionService,
            TreeSharingService treeSharingService,
            AuditService auditService,
            EventService eventService,
            AuthorizationService authorizationService,
            TreeRepository treeRepository,
            TreeCollaboratorRepository collaboratorRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            ClaimRepository claimRepository,
            TreeShareTokenRepository treeShareTokenRepository,
            CollaborationInvitationRepository invitationRepository,
            VerificationCodeRepository verificationCodeRepository,
            PersonPhotoRepository photoRepository,
            InAppReminderRepository reminderRepository,
            LivingPersonPolicy livingPersonPolicy,
            RateLimiter rateLimiter) {
        this.treeRegionService = treeRegionService;
        this.treeSharingService = treeSharingService;
        this.auditService = auditService;
        this.eventService = eventService;
        this.authorizationService = authorizationService;
        this.treeRepository = treeRepository;
        this.collaboratorRepository = collaboratorRepository;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.claimRepository = claimRepository;
        this.treeShareTokenRepository = treeShareTokenRepository;
        this.invitationRepository = invitationRepository;
        this.verificationCodeRepository = verificationCodeRepository;
        this.photoRepository = photoRepository;
        this.reminderRepository = reminderRepository;
        this.livingPersonPolicy = livingPersonPolicy;
        this.rateLimiter = rateLimiter;
    }

    @GetMapping
    public List<TreeSummaryResponse> list() {
        AuthContext context = authorizationService.requireAuthenticatedViewer();
        Map<UUID, TreeSummaryResponse> rows = new LinkedHashMap<>();
        treeRepository.findAllByOwnerUserIdOrderByCreatedAtAsc(context.userId())
                .forEach(tree -> rows.put(tree.getId(), TreeSummaryResponse.from(tree, true)));
        collaboratorRepository.findByUserId(context.userId()).forEach(collaborator ->
                treeRepository.findById(collaborator.getTreeId()).ifPresent(tree ->
                        rows.putIfAbsent(tree.getId(), TreeSummaryResponse.from(tree, false))));
        return List.copyOf(rows.values());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TreeSummaryResponse create(
            @RequestBody CreateTreeRequest request,
            @RequestHeader(value = "X-Forwarded-For", required = false) String remoteAddr) {
        AuthContext context = authorizationService.requireAuthenticatedViewer();
        rateLimiter.check("create-tree:" + context.userId());
        rateLimiter.check("mutate-ip:" + (remoteAddr == null || remoteAddr.isBlank() ? "unknown" : remoteAddr));

        String region = request == null || request.region() == null || request.region().isBlank()
                ? Tree.DEFAULT_REGION
                : request.region().trim();
        if (!Tree.isValidRegion(region)) {
            throw ApiException.validation("region", "Region must be one of Bac, Trung, or Nam.");
        }
        String name = request == null ? null : request.name();
        Tree saved = treeRepository.save(new Tree(context.userId(), region, name));
        return TreeSummaryResponse.from(saved, true);
    }

    @GetMapping("/{treeId}")
    public TreeDetailResponse read(
            @PathVariable("treeId") UUID treeId,
            @RequestHeader(value = "X-Share-Token", required = false) String shareToken) {
        authorizationService.requireReadAccess(treeId, shareToken);
        Tree tree = treeRepository.findById(treeId)
                .orElseThrow(() -> ApiException.nodeNotAccessible("The specified tree was not found."));

        List<UUID> claimedIds = claimRepository.findUserIdsWithClaimsInTree(treeId).isEmpty()
                ? List.of()
                : personRepository.findByTreeId(treeId).stream()
                        .filter(person -> claimRepository.existsByPersonId(person.getId()))
                        .map(Person::getId)
                        .toList();

        List<TreeDetailResponse.PersonItem> persons = personRepository.findByTreeId(treeId).stream()
                .map(person -> projectPerson(tree, person, claimedIds.contains(person.getId())))
                .toList();
        List<TreeDetailResponse.RelationshipItem> relationships = relationshipRepository.findByTreeId(treeId).stream()
                .map(this::projectRelationship)
                .toList();
        return new TreeDetailResponse(tree.getId(), tree.getName(), tree.getRegion(), tree.getSharing(),
                tree.isLivingRedaction(), persons, relationships);
    }

    @DeleteMapping("/{treeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable("treeId") UUID treeId,
            @RequestHeader(value = "X-Forwarded-For", required = false) String remoteAddr) {
        authorizationService.requireOwner(treeId);
        AuthContext context = authorizationService.currentContext();
        rateLimiter.check("delete-tree:" + context.userId());
        rateLimiter.check("mutate-ip:" + (remoteAddr == null || remoteAddr.isBlank() ? "unknown" : remoteAddr));
        cascadeDeleteTree(treeId);
    }

    @PatchMapping("/{treeId}/region")
    public RegionChangeResponse changeRegion(
            @PathVariable("treeId") UUID treeId, @RequestBody RegionChangeRequest request) {
        Tree tree = treeRegionService.changeRegion(treeId, request.region());
        return RegionChangeResponse.from(tree);
    }

    @PatchMapping("/{treeId}/sharing")
    public SharingResponse changeSharing(
            @PathVariable("treeId") UUID treeId, @RequestBody SharingUpdateRequest request) {
        Tree tree = treeSharingService.changeSharing(treeId, request.sharing());
        auditService.record(AuditService.SHARING_CHANGED, "tree", treeId, tree.getSharing()); // 25.2
        return SharingResponse.from(tree);
    }

    @PostMapping("/{treeId}/share-token")
    public ShareTokenResponse issueShareToken(@PathVariable("treeId") UUID treeId) {
        String token = treeSharingService.issueShareToken(treeId);
        auditService.record(AuditService.SHARE_TOKEN_ISSUED, "tree", treeId); // 25.2 (no token logged)
        return new ShareTokenResponse(treeId, token);
    }

    @DeleteMapping("/{treeId}/share-token")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeShareToken(@PathVariable("treeId") UUID treeId) {
        treeSharingService.revokeShareToken(treeId);
        auditService.record(AuditService.SHARE_TOKEN_REVOKED, "tree", treeId); // 25.2
    }

    @PatchMapping("/{treeId}/living-redaction")
    public LivingRedactionResponse setLivingRedaction(
            @PathVariable("treeId") UUID treeId, @RequestBody LivingRedactionRequest request) {
        Tree tree = treeSharingService.setLivingRedaction(treeId, request.enabled());
        auditService.record(AuditService.LIVING_REDACTION_CHANGED, "tree", treeId,
                String.valueOf(tree.isLivingRedaction())); // 25.2
        return LivingRedactionResponse.from(tree);
    }

    @GetMapping("/{treeId}/upcoming-events")
    public List<UpcomingEventResponse> getUpcomingEvents(
            @PathVariable("treeId") UUID treeId,
            @RequestParam(value = "days", defaultValue = "30") int days,
            @RequestHeader(value = "X-Share-Token", required = false) String shareToken) {
        authorizationService.requireReadAccess(treeId, shareToken);
        return eventService.getUpcomingEvents(treeId, days);
    }

    private TreeDetailResponse.PersonItem projectPerson(Tree tree, Person person, boolean claimed) {
        Role role = authorizationService.classify(tree.getId(), person.getId());
        boolean privileged = role != Role.NEITHER;
        boolean redactLiving = !privileged && tree.isLivingRedaction() && livingPersonPolicy.isLiving(person);
        boolean nameHidden = redactLiving || (!privileged && "private".equals(person.getVisName()));
        boolean birthYearHidden = redactLiving || (!privileged && "private".equals(person.getVisBirthYear()));
        boolean deathVisible = privileged || "public".equals(person.getVisDeath());
        return new TreeDetailResponse.PersonItem(
                person.getId(),
                nameHidden ? "Người thân còn sống" : person.getDisplayName(),
                person.getGender(),
                redactLiving ? null : person.getBirthOrder(),
                birthYearHidden ? null : person.getBirthYear(),
                null,
                null,
                deathVisible ? person.isDeathStatus() : null,
                deathVisible ? person.getDeathDay() : null,
                deathVisible ? person.getDeathMonth() : null,
                deathVisible ? person.getDeathYear() : null,
                deathVisible ? person.getDeathCalendar() : null,
                deathVisible ? person.getDeathLunarLeap() : null,
                person.getVisName(),
                person.getVisBirthYear(),
                person.getVisPhoto(),
                person.getVisDeath(),
                person.getVisMarital(),
                person.getVisAdoption(),
                claimed);
    }

    private TreeDetailResponse.RelationshipItem projectRelationship(Relationship relationship) {
        return new TreeDetailResponse.RelationshipItem(
                relationship.getId(),
                relationship.getType(),
                relationship.getSourceId(),
                relationship.getTargetId(),
                relationship.getMaritalStatus(),
                relationship.getDerivationState(),
                relationship.getAssertedLabel(),
                relationship.getSocialType());
    }

    private void cascadeDeleteTree(UUID treeId) {
        treeShareTokenRepository.deleteByTreeId(treeId);
        List<UUID> personIds = personRepository.findByTreeId(treeId).stream()
                .map(Person::getId)
                .toList();
        relationshipRepository.deleteAll(relationshipRepository.findByTreeId(treeId));
        if (!personIds.isEmpty()) {
            photoRepository.deleteByPersonIdIn(personIds);
            reminderRepository.deleteByPersonIdIn(personIds);
            claimRepository.deleteByPersonIdIn(personIds);
            verificationCodeRepository.deleteByPersonIdIn(personIds);
        }
        personRepository.deleteAll(personRepository.findByTreeId(treeId));
        collaboratorRepository.deleteByTreeId(treeId);
        invitationRepository.deleteByTreeId(treeId);
        treeRepository.deleteById(treeId);
    }
}
