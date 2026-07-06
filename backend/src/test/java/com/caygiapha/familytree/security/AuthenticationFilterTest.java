package com.caygiapha.familytree.security;

import static org.assertj.core.api.Assertions.assertThat;
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

/**
 * Unit tests for {@link AuthenticationFilter} (design "Request Flow Summary"; Requirements 2.3,
 * 2.8): a valid session resolves to an authenticated {@link AuthContext} carrying the user and
 * their owned tree, while a missing / malformed / expired-or-revoked session yields the anonymous
 * context. The bound context is always cleared once the request completes.
 *
 * <p>A real {@link SessionCookieFactory} (pure token parsing) and {@link AuthContextHolder} are
 * used; {@link SessionService}, {@link UserRepository}, and {@link TreeRepository} are mocked.
 */
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
        UUID token = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        when(sessionService.resolveUserId(token)).thenReturn(Optional.of(userId));
        when(userRepository.existsById(userId)).thenReturn(true);
        Tree tree = mock(Tree.class);
        when(tree.getId()).thenReturn(treeId);
        when(treeRepository.findFirstByOwnerUserIdOrderByCreatedAtAsc(userId)).thenReturn(Optional.of(tree));

        AuthContext captured = runFilterWithCookie(token.toString());

        assertThat(captured.isAuthenticated()).isTrue();
        assertThat(captured.userId()).isEqualTo(userId);
        assertThat(captured.ownedTreeId()).contains(treeId);
        // Context is cleared after the request completes.
        assertThat(holder.current().isAuthenticated()).isFalse();
    }

    @Test
    void authenticatedUserWithoutTreeHasEmptyOwnedTree() throws Exception {
        UUID token = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(sessionService.resolveUserId(token)).thenReturn(Optional.of(userId));
        when(userRepository.existsById(userId)).thenReturn(true);
        when(treeRepository.findFirstByOwnerUserIdOrderByCreatedAtAsc(userId)).thenReturn(Optional.empty());

        AuthContext captured = runFilterWithCookie(token.toString());

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
    void malformedTokenYieldsAnonymousContext() throws Exception {
        AuthContext captured = runFilterWithCookie("not-a-uuid");

        assertThat(captured.isAuthenticated()).isFalse();
    }

    @Test
    void expiredOrRevokedSessionYieldsAnonymousContext() throws Exception {
        UUID token = UUID.randomUUID();
        // SessionService enforces server-side expiry/revocation and returns empty (2.3, 2.8).
        when(sessionService.resolveUserId(token)).thenReturn(Optional.empty());

        AuthContext captured = runFilterWithCookie(token.toString());

        assertThat(captured.isAuthenticated()).isFalse();
    }

    @Test
    void sessionForMissingUserYieldsAnonymousContext() throws Exception {
        UUID token = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(sessionService.resolveUserId(token)).thenReturn(Optional.of(userId));
        when(userRepository.existsById(userId)).thenReturn(false);

        AuthContext captured = runFilterWithCookie(token.toString());

        assertThat(captured.isAuthenticated()).isFalse();
    }

    private AuthContext runFilterWithCookie(String cookieValue) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(SessionCookieFactory.COOKIE_NAME, cookieValue));
        return runFilter(request);
    }

    private AuthContext runFilter(MockHttpServletRequest request) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        AuthContext[] captured = {null};
        filter.doFilter(request, response, (req, res) -> captured[0] = holder.current());
        // The context is also exposed as a request attribute for the duration of the request.
        return captured[0];
    }
}
