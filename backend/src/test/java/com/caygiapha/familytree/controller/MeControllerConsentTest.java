package com.caygiapha.familytree.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.ConsentReacceptanceRequest;
import com.caygiapha.familytree.dto.ConsentReacceptanceResponse;
import com.caygiapha.familytree.dto.SubjectNodeSummary;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.UserRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.service.AuditService;
import com.caygiapha.familytree.service.ConsentService;
import com.caygiapha.familytree.service.DataRightsService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MeControllerConsentTest {

    private ConsentService consentService;
    private AuthorizationService authorizationService;
    private MeController controller;

    @BeforeEach
    void setUp() {
        consentService = mock(ConsentService.class);
        authorizationService = mock(AuthorizationService.class);
        controller = new MeController(
                mock(DataRightsService.class),
                mock(AuditService.class),
                null,
                authorizationService,
                mock(UserRepository.class),
                consentService);
    }

    @Test
    void recordConsentUsesTheAuthenticatedSessionAndClearsTheGate() {
        UUID userId = UUID.randomUUID();
        when(authorizationService.requireAuthenticatedViewer())
                .thenReturn(AuthContext.authenticated(userId, null));

        ConsentReacceptanceResponse response = controller.recordConsent(
                new ConsentReacceptanceRequest(true, true));

        verify(consentService).requireConsent(true, true);
        verify(consentService).recordConsent(userId);
        assertThat(response.consentRequired()).isFalse();
        JsonNode json = new ObjectMapper().valueToTree(response);
        assertThat(json.path("consentRequired").asBoolean()).isFalse();
    }

    @Test
    void recordConsentDoesNotAcceptAUserIdFromTheRequestBody() {
        UUID sessionUserId = UUID.randomUUID();
        when(authorizationService.requireAuthenticatedViewer())
                .thenReturn(AuthContext.authenticated(sessionUserId, null));

        controller.recordConsent(new ConsentReacceptanceRequest(true, true));

        verify(consentService).recordConsent(sessionUserId);
    }

    @Test
    void listNodesReturnsLinkedSubjectNodesForTheSession() {
        UUID personId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        DataRightsService dataRightsService = mock(DataRightsService.class);
        when(dataRightsService.listSubjectNodes()).thenReturn(List.of(
                new SubjectNodeSummary(personId, treeId, "An", "Họ Nguyễn", null)));
        MeController nodesController = new MeController(
                dataRightsService,
                mock(AuditService.class),
                null,
                authorizationService,
                mock(UserRepository.class),
                consentService);

        List<SubjectNodeSummary> rows = nodesController.listNodes();

        assertThat(rows).singleElement().satisfies(row -> {
            assertThat(row.personId()).isEqualTo(personId);
            assertThat(row.treeName()).isEqualTo("Họ Nguyễn");
        });
        JsonNode json = new ObjectMapper().valueToTree(rows);
        assertThat(json.path(0).path("personId").asText()).isEqualTo(personId.toString());
        assertThat(json.path(0).path("treeId").asText()).isEqualTo(treeId.toString());
        assertThat(json.path(0).path("displayName").asText()).isEqualTo("An");
    }

    @Test
    void recordConsentRejectsUnauthenticatedCallers() {
        when(authorizationService.requireAuthenticatedViewer())
                .thenThrow(ApiException.notAuthorized("Bạn cần đăng nhập để ghi nhận chấp thuận."));

        assertThatThrownBy(() -> controller.recordConsent(new ConsentReacceptanceRequest(true, true)))
                .isInstanceOfSatisfying(ApiException.class, ex ->
                        assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
        verifyNoInteractions(consentService);
    }
}
