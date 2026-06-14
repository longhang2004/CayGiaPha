package com.caygiapha.familytree.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.PersonResponse;
import com.caygiapha.familytree.dto.PersonVisibility;
import com.caygiapha.familytree.dto.VisibilityUpdateRequest;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.security.AuthorizationService.Role;
import com.caygiapha.familytree.service.PersonService;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link PersonController}'s privacy-filter read path and owner-only visibility
 * setter (Requirements 14.1, 14.3, 14.4, 14.5). The controller classifies the viewer via
 * {@link AuthorizationService} and projects through the {@link PersonResponse} privacy filter, so
 * these tests drive the role classification and assert the resulting field exposure.
 */
class PersonControllerTest {

    private PersonService personService;
    private com.caygiapha.familytree.service.PersonDeletionService personDeletionService;
    private AuthorizationService authorizationService;
    private com.caygiapha.familytree.repository.TreeRepository treeRepository;
    private com.caygiapha.familytree.service.LivingPersonPolicy livingPersonPolicy;
    private com.caygiapha.familytree.service.AuditService auditService;
    private com.caygiapha.familytree.service.PhotoService photoService;
    private PersonController controller;

    private final UUID treeId = UUID.randomUUID();
    private final UUID personId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        personService = mock(PersonService.class);
        personDeletionService = mock(com.caygiapha.familytree.service.PersonDeletionService.class);
        authorizationService = mock(AuthorizationService.class);
        treeRepository = mock(com.caygiapha.familytree.repository.TreeRepository.class);
        livingPersonPolicy = mock(com.caygiapha.familytree.service.LivingPersonPolicy.class);
        auditService = mock(com.caygiapha.familytree.service.AuditService.class);
        photoService = mock(com.caygiapha.familytree.service.PhotoService.class);
        controller = new PersonController(
                personService, personDeletionService, authorizationService,
                treeRepository, livingPersonPolicy, auditService, photoService);
    }

    /** A person with both sensitive fields set and kept private. */
    private Person privatePerson() {
        Person p = new Person(treeId, "An", "female");
        p.setDeathStatus(true);
        p.setAdoptionStatus(true);
        p.setVisDeath(PersonVisibility.PRIVATE);
        p.setVisAdoption(PersonVisibility.PRIVATE);
        when(personService.read(treeId, personId)).thenReturn(p);
        return p;
    }

    @Test
    void ownerSeesPrivateSensitiveFields() {
        privatePerson();
        when(authorizationService.classify(treeId, personId)).thenReturn(Role.OWNER);

        PersonResponse body = controller.read(personId, treeId, null).getBody();

        assertThat(body).isNotNull();
        assertThat(body.deathStatus()).isTrue(); // 14.3
        assertThat(body.adoptionStatus()).isTrue();
    }

    @Test
    void linkedUserSeesTheirOwnClaimedNodesPrivateFields() {
        privatePerson();
        when(authorizationService.classify(treeId, personId))
                .thenReturn(Role.LINKED_CLAIMED_USER);

        PersonResponse body = controller.read(personId, treeId, null).getBody();

        assertThat(body).isNotNull();
        assertThat(body.deathStatus()).isTrue(); // 14.3 — linked user is privileged for their node
        assertThat(body.adoptionStatus()).isTrue();
    }

    @Test
    void nonOwnerNonLinkedViewerDoesNotSeePrivateFields() {
        privatePerson();
        when(authorizationService.classify(treeId, personId)).thenReturn(Role.NEITHER);

        PersonResponse body = controller.read(personId, treeId, null).getBody();

        assertThat(body).isNotNull();
        assertThat(body.deathStatus()).isNull(); // 14.4 — omitted
        assertThat(body.adoptionStatus()).isNull();
        // 14.4 — non-private fields still returned.
        assertThat(body.displayName()).isEqualTo("An");
        assertThat(body.gender()).isEqualTo("female");
    }

    @Test
    void publicSensitiveFieldsAreShownToAnyViewer() {
        Person p = new Person(treeId, "An", "female");
        p.setDeathStatus(true);
        p.setVisDeath(PersonVisibility.PUBLIC);
        when(personService.read(treeId, personId)).thenReturn(p);
        when(authorizationService.classify(treeId, personId)).thenReturn(Role.NEITHER);

        PersonResponse body = controller.read(personId, treeId, null).getBody();

        assertThat(body).isNotNull();
        assertThat(body.deathStatus()).isTrue(); // 14.5
    }

    @Test
    void setVisibilityRequiresOwnerAndDelegates() {
        Person updated = new Person(treeId, "An", "female");
        updated.setVisDeath(PersonVisibility.PUBLIC);
        VisibilityUpdateRequest request =
                new VisibilityUpdateRequest(null, null, PersonVisibility.PUBLIC, null, null, null);
        when(personService.setVisibility(eq(treeId), eq(personId), any())).thenReturn(updated);

        PersonResponse body = controller.setVisibility(personId, treeId, request);

        verify(authorizationService).requireMutationPermitted(treeId, personId); // owner or linked (21.5)
        verify(personService).setVisibility(treeId, personId, request);
        assertThat(body.visDeath()).isEqualTo(PersonVisibility.PUBLIC);
    }

    @Test
    void setVisibilityRejectedForNonOwner() {
        VisibilityUpdateRequest request =
                new VisibilityUpdateRequest(null, null, PersonVisibility.PUBLIC, null, null, null);
        org.mockito.Mockito.doThrow(ApiException.notAuthorized("nope"))
                .when(authorizationService).requireMutationPermitted(treeId, personId);

        assertThatThrownBy(() -> controller.setVisibility(personId, treeId, request))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
        verify(personService, org.mockito.Mockito.never()).setVisibility(any(), any(), any());
    }

    // ----- Two-phase deletion (Requirements 3.4, 15.1, 15.2, 15.3) -----

    @Test
    void beginDeletionRequiresOwnerAndReturnsTwoOptions() {
        when(personDeletionService.beginDeletion(treeId, personId))
                .thenReturn(com.caygiapha.familytree.dto.DeletionChoiceResponse.forPerson(personId));

        var response = controller.beginDeletion(personId, treeId);

        verify(authorizationService).requireOwner(treeId); // delete is owner-only (13.4)
        verify(personDeletionService).beginDeletion(treeId, personId);
        assertThat(response.options()).hasSize(2);
        assertThat(response.options())
                .extracting(
                        com.caygiapha.familytree.dto.DeletionChoiceResponse.DeletionOption::strategy)
                .containsExactlyInAnyOrder("cascade", "preserve");
    }

    @Test
    void beginDeletionRejectedForNonOwner() {
        org.mockito.Mockito.doThrow(ApiException.notAuthorized("nope"))
                .when(authorizationService).requireOwner(treeId);

        assertThatThrownBy(() -> controller.beginDeletion(personId, treeId))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
        verify(personDeletionService, org.mockito.Mockito.never())
                .beginDeletion(any(), any());
    }

    @Test
    void executeRequiresOwnerAndDelegatesWithStrategy() {
        controller.execute(personId, treeId,
                new com.caygiapha.familytree.dto.DeletePersonRequest("cascade"));

        verify(authorizationService).requireOwner(treeId); // owner-only (13.4)
        verify(personDeletionService).execute(treeId, personId, "cascade");
    }

    @Test
    void executeRejectedForNonOwnerDoesNotDelegate() {
        org.mockito.Mockito.doThrow(ApiException.notAuthorized("nope"))
                .when(authorizationService).requireOwner(treeId);

        assertThatThrownBy(() -> controller.execute(personId, treeId,
                new com.caygiapha.familytree.dto.DeletePersonRequest("cascade")))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
        verify(personDeletionService, org.mockito.Mockito.never())
                .execute(any(), any(), any());
    }
}
