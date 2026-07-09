package com.caygiapha.familytree.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.config.SessionCookieFactory;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import com.caygiapha.familytree.service.SessionService;
import jakarta.servlet.http.Cookie;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthenticationFilterTest {

    private final SessionService sessionService = mock(SessionService.class);
    private final SessionCookieFactory cookieFactory = new SessionCookieFactory();
    private final UserRepository userRepository = mock(UserRepository.class);
    private final TreeRepository treeRepository = mock(TreeRepository.class);
    private final AuthContextHolder holder = new AuthContextHolder();

    private final AuthenticationFilter filter = new AuthenticationFilter(
            sessionService, cookieFactory, userRepository, treeRepository, holder);

    @AfterEach
    void tearDown() {
        holder.clear();
    }

    @Test
    void validSessionResolvesAuthenticatedContextWithOwnedTree() throws Exception {
        String token = "opaque-token-value";
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        when(sessionService.resolveUserId(token)).thenReturn(Optional.of(userId));
        when(userRepository.existsById(userId)).thenReturn(true);
        Tree tree = mock(Tree.class);
        when(tree.getId()).thenReturn(treeId);
        when(treeRepository.findFirstByOwnerUserIdOrderByCreatedAtAsc(userId)).thenReturn(Optional.of(tree));

        AuthContext captured = runFilterWithCookie(token);

        assertThat(captured.isAuthenticated()).isTrue();
        assertThat(captured.userId()).isEqualTo(userId);
        assertThat(captured.ownedTreeId()).contains(treeId);
        assertThat(holder.current().isAuthenticated()).isFalse();
    }

    @Test
    void authenticatedUserWithoutTreeHasEmptyOwnedTree() throws Exception {
        String token = "opaque-token-value";
        UUID userId = UUID.randomUUID();
        when(sessionService.resolveUserId(token)).thenReturn(Optional.of(userId));
        when(userRepository.existsById(userId)).thenReturn(true);
        when(treeRepository.findFirstByOwnerUserIdOrderByCreatedAtAsc(userId)).thenReturn(Optional.empty());

        AuthContext captured = runFilterWithCookie(token);

        assertThat(captured.isAuthenticated()).isTrue();
        assertThat(captured.userId()).isEqualTo(userId);
        assertThat(captured.ownedTreeId()).isEmpty();
    }

    @Test
    void missingCookieYieldsAnonymousContext() throws Exception {
        AuthContext captured = runFilter(new MockHttpServletRequest());

        assertThat(captured.isAuthenticated()).isFalse();
    }

    @Test
    void unknownTokenYieldsAnonymousContext() throws Exception {
        when(sessionService.resolveUserId(anyString())).thenReturn(Optional.empty());

        AuthContext captured = runFilterWithCookie("not-a-known-token");

        assertThat(captured.isAuthenticated()).isFalse();
    }

    @Test
    void expiredOrRevokedSessionYieldsAnonymousContext() throws Exception {
        String token = "expired-token";
        when(sessionService.resolveUserId(token)).thenReturn(Optional.empty());

        AuthContext captured = runFilterWithCookie(token);

        assertThat(captured.isAuthenticated()).isFalse();
    }

    @Test
    void sessionForMissingUserYieldsAnonymousContext() throws Exception {
        String token = "orphan-token";
        UUID userId = UUID.randomUUID();
        when(sessionService.resolveUserId(token)).thenReturn(Optional.of(userId));
        when(userRepository.existsById(userId)).thenReturn(false);

        AuthContext captured = runFilterWithCookie(token);

        assertThat(captured.isAuthenticated()).isFalse();
    }

    private AuthContext runFilterWithCookie(String cookieValue) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(SessionCookieFactory.COOKIE_NAME, cookieValue));
        return runFilter(request);
    }

    private AuthContext runFilter(MockHttpServletRequest request) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        final AuthContext[] captured = new AuthContext[1];
        filter.doFilter(request, response, (req, res) -> {
            captured[0] = holder.current();
        });
        return captured[0];
    }
}
