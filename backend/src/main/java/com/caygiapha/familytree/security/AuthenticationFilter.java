package com.caygiapha.familytree.security;

import com.caygiapha.familytree.config.SessionCookieFactory;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.platform.security.JwtTokenService;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import com.caygiapha.familytree.service.SessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Resolves the session cookie of each request into an {@link AuthContext} and binds it to the
 * request thread (design "Request Flow Summary"; Requirements 11.6, 13.4, 13.5).
 *
 * <p>On every request the filter:
 * <ol>
 *   <li>reads the {@code SESSION} cookie and parses its opaque token via
 *       {@link SessionCookieFactory#parseToken};</li>
 *   <li>resolves the token to an authenticated user id with {@link SessionService#resolveUserId}
 *       (server-side expiry/revocation enforced there — Requirements 2.3, 2.8);</li>
 *   <li>confirms the resolved {@code User} still exists and loads their earliest owned tree as a
 *       legacy default context;</li>
 *   <li>binds the resulting {@link AuthContext} through {@link AuthContextHolder} and also exposes
 *       it as the {@link #REQUEST_ATTRIBUTE} request attribute.</li>
 * </ol>
 *
 * <p>Unauthenticated requests — no cookie, or a token that is unknown / revoked / expired — proceed
 * with {@link AuthContext#anonymous()} rather than being blocked here; per-endpoint authorization
 * (via {@link AuthorizationService}) decides where a session is actually required. This matches the
 * design's "minimize unauthenticated surface" note: {@code /auth/**} and claim verification work
 * without a session, while every mutation enforces ownership / claimed-node linkage downstream.
 *
 * <p>The bound context is always cleared in a {@code finally} block so it never leaks across the
 * pooled request threads of the servlet container.
 */
public class AuthenticationFilter extends OncePerRequestFilter {

    /** Request attribute under which the resolved {@link AuthContext} is also exposed. */
    public static final String REQUEST_ATTRIBUTE = "authContext";

    private final SessionService sessionService;
    private final SessionCookieFactory sessionCookieFactory;
    private final UserRepository userRepository;
    private final TreeRepository treeRepository;
    private final AuthContextHolder authContextHolder;
    private final JwtTokenService jwtTokenService;

    public AuthenticationFilter(
            SessionService sessionService,
            SessionCookieFactory sessionCookieFactory,
            UserRepository userRepository,
            TreeRepository treeRepository,
            AuthContextHolder authContextHolder) {
        this(sessionService, sessionCookieFactory, userRepository, treeRepository, authContextHolder, null);
    }

    public AuthenticationFilter(
            SessionService sessionService,
            SessionCookieFactory sessionCookieFactory,
            UserRepository userRepository,
            TreeRepository treeRepository,
            AuthContextHolder authContextHolder,
            JwtTokenService jwtTokenService) {
        this.sessionService = sessionService;
        this.sessionCookieFactory = sessionCookieFactory;
        this.userRepository = userRepository;
        this.treeRepository = treeRepository;
        this.authContextHolder = authContextHolder;
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        AuthContext context = resolveContext(request);
        authContextHolder.set(context);
        request.setAttribute(REQUEST_ATTRIBUTE, context);
        try {
            filterChain.doFilter(request, response);
        } finally {
            authContextHolder.clear();
        }
    }

    private AuthContext resolveContext(HttpServletRequest request) {
        Optional<String> token =
                readSessionCookie(request).flatMap(sessionCookieFactory::parseToken);
        Optional<UUID> userId = token.flatMap(sessionService::resolveUserId);
        if (userId.isEmpty()) {
            userId = readBearerToken(request).flatMap(this::resolveJwtUserId);
        }
        if (userId.isEmpty()) {
            return AuthContext.anonymous();
        }
        UUID uid = userId.get();
        if (!userRepository.existsById(uid)) {
            return AuthContext.anonymous();
        }
        UUID ownedTreeId =
                treeRepository.findFirstByOwnerUserIdOrderByCreatedAtAsc(uid).map(Tree::getId).orElse(null);
        return AuthContext.authenticated(uid, ownedTreeId);
    }

    private Optional<UUID> resolveJwtUserId(String bearer) {
        if (jwtTokenService == null) {
            return Optional.empty();
        }
        return jwtTokenService.parseUserId(bearer);
    }

    private Optional<String> readBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || header.length() < 8 || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return Optional.empty();
        }
        String value = header.substring(7).trim();
        return value.isEmpty() ? Optional.empty() : Optional.of(value);
    }

    private Optional<String> readSessionCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        for (Cookie cookie : cookies) {
            if (SessionCookieFactory.COOKIE_NAME.equals(cookie.getName())) {
                return Optional.ofNullable(cookie.getValue());
            }
        }
        return Optional.empty();
    }
}
