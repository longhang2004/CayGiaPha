package com.caygiapha.familytree.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.TreeDetailResponse;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Tree;
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
    private PersonRepository personRepository;
    private RelationshipRepository relationshipRepository;
    private ClaimRepository claimRepository;
    private TreeController controller;

    @BeforeEach
    void setUp() {
        authorizationService = mock(AuthorizationService.class);
        treeRepository = mock(TreeRepository.class);
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
                mock(TreeCollaboratorRepository.class),
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
}
