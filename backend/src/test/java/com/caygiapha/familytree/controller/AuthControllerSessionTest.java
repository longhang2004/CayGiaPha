package com.caygiapha.familytree.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.AuthSessionResponse;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.UserRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthContextHolder;
import com.caygiapha.familytree.service.ConsentService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class AuthControllerSessionTest {

    private final AuthContextHolder authContextHolder = new AuthContextHolder();
    private final UserRepository userRepository = mock(UserRepository.class);
    private final ConsentService consentService = mock(ConsentService.class);
    private final AuthController controller = new AuthController(
            null,
            null,
            consentService,
            null,
            null,
            authContextHolder,
            userRepository);

    @AfterEach
    void clearAuthContext() {
        authContextHolder.clear();
    }

    @Test
    void sessionReturnsCurrentAuthenticatedUser() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        User user = User.withEmail("owner@example.com");
        ReflectionTestUtils.setField(user, "id", userId);
        user.setVerified(true);
        user.setRole("admin");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(consentService.needsReacceptance(userId)).thenReturn(false);
        authContextHolder.set(AuthContext.authenticated(userId, treeId));

        AuthSessionResponse response = controller.session();

        assertThat(response.userId()).isEqualTo(userId);
        assertThat(response.treeId()).isEqualTo(treeId);
        assertThat(response.identifier()).isEqualTo("owner@example.com");
        assertThat(response.verified()).isTrue();
        assertThat(response.role()).isEqualTo("admin");
        assertThat(response.consentRequired()).isFalse();
    }

    @Test
    void sessionIncludesConsentRequiredWhenStoredConsentIsStale() {
        UUID userId = UUID.randomUUID();
        User user = User.withEmail("owner@example.com");
        ReflectionTestUtils.setField(user, "id", userId);
        user.setVerified(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(consentService.needsReacceptance(userId)).thenReturn(true);
        authContextHolder.set(AuthContext.authenticated(userId, UUID.randomUUID()));

        AuthSessionResponse response = controller.session();

        assertThat(response.consentRequired()).isTrue();
        JsonNode json = new ObjectMapper().valueToTree(response);
        assertThat(json.path("consentRequired").asBoolean()).isTrue();
        assertThat(json.path("userId").asText()).isEqualTo(userId.toString());
    }

    @Test
    void sessionRejectsAnonymousRequest() {
        assertThatThrownBy(controller::session)
                .isInstanceOfSatisfying(ApiException.class, ex ->
                        assertThat(ex.code()).isEqualTo(ErrorCode.ACCOUNT_NOT_FOUND));
    }
}
