package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Session;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mindrot.jbcrypt.BCrypt;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthServicePasswordResetTest {

    @Mock private UserRepository userRepository;
    private IdentifierValidator identifierValidator = new IdentifierValidator();
    @Mock private VerificationCodeService verificationCodeService;
    @Mock private SessionService sessionService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                null,
                identifierValidator,
                null,
                verificationCodeService,
                sessionService,
                null,
                null);
    }

    @Test
    void requestPasswordReset_WhenAccountNotFound_DoesNotRevealExistence() {
        String email = "test@example.com";
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        authService.requestPasswordReset(email);

        verify(verificationCodeService, never()).issueForAccount(any(), any(), any());
    }

    @Test
    void requestPasswordReset_WhenAccountUnverified_DoesNotRevealExistence() {
        String email = "test@example.com";
        User user = User.withEmail(email);
        user.setVerified(false);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        authService.requestPasswordReset(email);

        verify(verificationCodeService, never()).issueForAccount(any(), any(), any());
    }

    @Test
    void requestPasswordReset_WhenAccountExistsAndVerified_IssuesCode() {
        String email = "test@example.com";
        User user = User.withEmail(email);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.setVerified(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        authService.requestPasswordReset(email);

        verify(verificationCodeService).issueForAccount(VerificationPurpose.PASSWORD_RESET, user.getId(), email);
    }

    @Test
    void confirmPasswordReset_WhenCodeInvalid_Throws() {
        String email = "test@example.com";
        String code = "123456";
        String password = "newPassword123";
        User user = User.withEmail(email);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.setVerified(true);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        
        ApiException expectedError = ApiException.codeInvalid("err");
        org.mockito.Mockito.doThrow(expectedError)
            .when(verificationCodeService).verifyForAccount(VerificationPurpose.PASSWORD_RESET, user.getId(), code);

        assertThatThrownBy(() -> authService.confirmPasswordReset(email, code, password))
                .isSameAs(expectedError);
    }

    @Test
    void confirmPasswordReset_WhenSuccessful_UpdatesHashAndReturnsSession() {
        String email = "test@example.com";
        String code = "123456";
        String password = "newPassword123";
        User user = User.withEmail(email);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.setVerified(true);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        Session session = new Session(user.getId(), Instant.now());
        when(sessionService.create(user.getId())).thenReturn(session);

        Session result = authService.confirmPasswordReset(email, code, password);

        assertThat(result).isSameAs(session);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User saved = userCaptor.getValue();

        assertThat(BCrypt.checkpw(password, saved.getPasswordHash())).isTrue();
    }
}
