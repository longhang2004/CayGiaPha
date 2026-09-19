package com.caygiapha.familytree.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.TreeDetailResponse;
import com.caygiapha.familytree.dto.TreeSummaryResponse;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.entity.TreeCollaborator;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.repository.ClaimRepository;
import com.caygiapha.familytree.repository.CollaborationInvitationRepository;
import com.caygiapha.familytree.repository.InAppReminderRepository;
import com.caygiapha.familytree.repository.PersonPhotoRepository;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.repository.TreeCollaboratorRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.TreeShareTokenRepository;
import com.caygiapha.familytree.repository.VerificationCodeRepository;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.security.AuthorizationService.Role;
import com.caygiapha.familytree.security.CapabilitySet;
import com.caygiapha.familytree.security.TreeAccessRole;
import com.caygiapha.familytree.service.AuditService;
import com.caygiapha.familytree.service.EventService;
import com.caygiapha.familytree.service.LivingPersonPolicy;
import com.caygiapha.familytree.service.RateLimiter;
import com.caygiapha.familytree.service.TreeRegionService;
import com.caygiapha.familytree.service.TreeSharingService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class TreeControllerTest {

    private AuthorizationService authorizationService;
    private TreeRepository treeRepository;
    private TreeCollaboratorRepository collaboratorRepository;
    private PersonRepository personRepository;
    private RelationshipRepository relationshipRepository;
    private ClaimRepository claimRepository;
    private TreeController controller;

    @BeforeEach
    void setUp() {
        authorizationService = mock(AuthorizationService.class);
        treeRepository = mock(TreeRepository.class);
        collaboratorRepository = mock(TreeCollaboratorRepository.class);
        personRepository = mock(PersonRepository.class);
        relationshipRepository = mock(RelationshipRepository.class);
        claimRepository = mock(ClaimRepository.class);
        controller = new TreeController(
                mock(TreeRegionService.class),
                mock(TreeSharingService.class),
                mock(AuditService.class),
                mock(EventService.class),
                authorizationService,
                treeRepository,
                collaboratorRepository,
                personRepository,
                relationshipRepository,
                claimRepository,
                mock(TreeShareTokenRepository.class),
                mock(CollaborationInvitationRepository.class),
                mock(VerificationCodeRepository.class),
                mock(PersonPhotoRepository.class),
                mock(InAppReminderRepository.class),
                mock(LivingPersonPolicy.class),
                mock(RateLimiter.class));
    }

    @Test
    void readReturnsTreeAndPersonCapabilitiesForTheSpringProxyContract() {
        UUID treeId = UUID.randomUUID();
        Tree tree = new Tree(UUID.randomUUID(), "Nam", "Cây họ Nguyễn");
        ReflectionTestUtils.setField(tree, "id", treeId);
        Person linkedPerson = new Person(treeId, "An", "male");
        UUID personId = UUID.randomUUID();
        ReflectionTestUtils.setField(linkedPerson, "id", personId);
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));
        when(claimRepository.findUserIdsWithClaimsInTree(treeId)).thenReturn(List.of());
        when(personRepository.findByTreeId(treeId)).thenReturn(List.of(linkedPerson));
        when(relationshipRepository.findByTreeId(treeId)).thenReturn(List.of());
        when(authorizationService.classifyTreeAccess(treeId, null))
                .thenReturn(TreeAccessRole.LINKED);
        when(authorizationService.classify(treeId, personId))
                .thenReturn(Role.LINKED_CLAIMED_USER);

        TreeDetailResponse response = controller.read(treeId, null);

        verify(authorizationService).requireReadAccess(treeId, null);
        assertThat(response.accessRole()).isEqualTo(TreeAccessRole.LINKED);
        assertThat(response.capabilities()).isEqualTo(CapabilitySet.none());
        assertThat(response.persons()).singleElement().satisfies(person -> {
            assertThat(person.displayName()).isEqualTo("An");
            assertThat(person.capabilities())
                    .isEqualTo(new CapabilitySet(true, false, true, true, false, false, false));
        });

        JsonNode json = new ObjectMapper().valueToTree(response);
        assertThat(json.path("accessRole").asText()).isEqualTo("LINKED");
        assertThat(json.path("capabilities").fieldNames())
                .toIterable()
                .containsExactlyInAnyOrder(
                        "editContent",
                        "editRelationships",
                        "editPhotos",
                        "editVisibility",
                        "manageClaim",
                        "manageTree",
                        "manageCollaboration");
        assertThat(json.path("persons").path(0).path("capabilities").path("editContent").asBoolean())
                .isTrue();
        assertThat(json.path("persons").path(0).path("capabilities").path("manageTree").asBoolean())
                .isFalse();
    }

    @Test
    void listReturnsOwnedContributedAndLinkedTreesWithStrongestAccessRole() {
        UUID userId = UUID.randomUUID();
        UUID ownedId = UUID.randomUUID();
        UUID contributedId = UUID.randomUUID();
        UUID linkedId = UUID.randomUUID();
        Tree owned = tree(ownedId, userId, "Owned");
        Tree contributed = tree(contributedId, UUID.randomUUID(), "Contributed");
        Tree linked = tree(linkedId, UUID.randomUUID(), "Linked");
        when(authorizationService.requireAuthenticatedViewer())
                .thenReturn(AuthContext.authenticated(userId, ownedId));
        when(treeRepository.findAllByOwnerUserIdOrderByCreatedAtAsc(userId))
                .thenReturn(List.of(owned));
        when(collaboratorRepository.findByUserId(userId))
                .thenReturn(List.of(
                        new TreeCollaborator(contributedId, userId, "contributor"),
                        new TreeCollaborator(ownedId, userId, "contributor")));
        when(treeRepository.findById(contributedId)).thenReturn(Optional.of(contributed));
        when(treeRepository.findById(ownedId)).thenReturn(Optional.of(owned));
        when(claimRepository.findTreeIdsLinkedToUser(userId))
                .thenReturn(List.of(linkedId, contributedId));
        when(treeRepository.findById(linkedId)).thenReturn(Optional.of(linked));

        List<TreeSummaryResponse> rows = controller.list();

        assertThat(rows).extracting(TreeSummaryResponse::id)
                .containsExactly(ownedId, contributedId, linkedId);
        assertThat(rows).extracting(TreeSummaryResponse::accessRole)
                .containsExactly(TreeAccessRole.OWNER, TreeAccessRole.CONTRIBUTOR, TreeAccessRole.LINKED);
        assertThat(rows).extracting(TreeSummaryResponse::isOwner)
                .containsExactly(true, false, false);

        JsonNode json = new ObjectMapper().valueToTree(rows);
        assertThat(json.path(0).path("accessRole").asText()).isEqualTo("OWNER");
        assertThat(json.path(0).path("isOwner").asBoolean()).isTrue();
        assertThat(json.path(1).path("accessRole").asText()).isEqualTo("CONTRIBUTOR");
        assertThat(json.path(2).path("accessRole").asText()).isEqualTo("LINKED");
        assertThat(json.path(2).path("isOwner").asBoolean()).isFalse();
    }

    private static Tree tree(UUID id, UUID ownerUserId, String name) {
        Tree tree = new Tree(ownerUserId, "Nam", name);
        ReflectionTestUtils.setField(tree, "id", id);
        return tree;
    }
}
