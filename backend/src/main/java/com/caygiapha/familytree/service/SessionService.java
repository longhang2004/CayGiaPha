package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.Session;
import com.caygiapha.familytree.repository.SessionRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Server-side session lifecycle for the {@code Auth_Service}: create, validate, and revoke the
 * 30-day authenticated sessions established on sign-in (Requirements 2.3, 2.8).
 *
 * <p>A session is represented by a {@link Session} row whose primary key is the opaque token (a
 * random UUID, ≥128 bits) carried in the {@code HttpOnly}/{@code Secure}/{@code SameSite} session
 * cookie. The token is kept server-side; expiry and revocation are enforced here, never trusted
 * from the client.
 *
 * <h2>Validity (2.3, 2.8)</h2>
 * A session authenticates a request <em>iff</em> it exists, has not been revoked, and the current
 * time (from the injected {@link Clock}) is before its {@code expires_at} deadline. {@link #resolve}
 * and {@link #resolveUserId} expose this check; the authentication filter (Task 7.1) calls
 * {@link #resolveUserId} to turn a cookie token into the authenticated user.
 *
 * <p>Time is taken from the injected {@link Clock} so expiry behavior is deterministic under test.
 */
@Service
public class SessionService {

    /** Authenticated-session lifetime: 30 days from creation (2.3). */
    public static final Duration SESSION_DURATION = Duration.ofDays(30);

    private final SessionRepository sessionRepository;
    private final Clock clock;

    public SessionService(SessionRepository sessionRepository, Clock clock) {
        this.sessionRepository = sessionRepository;
        this.clock = clock;
    }

    /**
     * Establish a new 30-day session for the given user (2.3).
     *
     * @param userId the authenticated user the session belongs to
     * @return the persisted {@link Session}; its {@link Session#getId() id} is the opaque token
     */
    @Mutation
    public Session create(UUID userId) {
        Instant expiresAt = clock.instant().plus(SESSION_DURATION);
        return sessionRepository.save(new Session(userId, expiresAt));
    }

    /**
     * Resolve a session token to its active {@link Session}, applying the server-side expiry and
     * revocation checks (2.3, 2.8).
     *
     * @param token the session token id from the cookie (may be {@code null})
     * @return the active session, or empty when the token is {@code null}, unknown, revoked, or
     *     expired
     */
    @Transactional(readOnly = true)
    public Optional<Session> resolve(UUID token) {
        if (token == null) {
            return Optional.empty();
        }
        Instant now = clock.instant();
        return sessionRepository.findById(token).filter(session -> session.isActive(now));
    }

    /**
     * Resolve a session token to the id of its authenticated user. This is the clean entry point
     * the authentication filter (Task 7.1) uses to authenticate a request.
     *
     * @param token the session token id from the cookie (may be {@code null})
     * @return the authenticated user's id, or empty when the session is absent/revoked/expired
     */
    @Transactional(readOnly = true)
    public Optional<UUID> resolveUserId(UUID token) {
        return resolve(token).map(Session::getUserId);
    }

    /**
     * Revoke a session so it can never authenticate again (sign-out; 2.8).
     *
     * <p>Revocation is idempotent: an unknown or already-revoked token is a no-op, so signing out
     * twice (or with a stale cookie) is harmless.
     *
     * @param token the session token id from the cookie (may be {@code null})
     */
    @Mutation
    public void revoke(UUID token) {
        if (token == null) {
            return;
        }
        sessionRepository.findById(token).ifPresent(session -> {
            if (!session.isRevoked()) {
                session.setRevoked(true);
                sessionRepository.save(session);
            }
        });
    }
}
