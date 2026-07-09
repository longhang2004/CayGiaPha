package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.Session;
import com.caygiapha.familytree.repository.SessionRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Server-side session lifecycle: create, validate, and revoke 30-day sessions (Requirements 2.3,
 * 2.8).
 *
 * <p>The cookie carries a high-entropy opaque token (32 random bytes, URL-safe base64). Only the
 * SHA-256 hash is persisted ({@code sessions.token_hash}). Legacy cookies that still hold a session
 * UUID are accepted via dual lookup until they expire.
 */
@Service
public class SessionService {

    public static final Duration SESSION_DURATION = Duration.ofDays(30);
    private static final int TOKEN_BYTES = 32;

    private final SessionRepository sessionRepository;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public SessionService(SessionRepository sessionRepository, Clock clock) {
        this.sessionRepository = sessionRepository;
        this.clock = clock;
    }

    /**
     * Establish a new 30-day session. The returned {@link Session#getRawToken()} is the value to put
     * in the cookie (available only on this instance; never reloaded from the DB).
     */
    @Mutation
    public Session create(UUID userId) {
        Instant expiresAt = clock.instant().plus(SESSION_DURATION);
        byte[] raw = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(raw);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        Session session = new Session(userId, expiresAt, hash(rawToken));
        session.setRawToken(rawToken);
        return sessionRepository.save(session);
    }

    /**
     * Resolve a presented cookie token to its active session.
     *
     * @param rawToken opaque cookie value (may be {@code null})
     */
    @Transactional(readOnly = true)
    public Optional<Session> resolve(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }
        Instant now = clock.instant();
        Optional<Session> byHash =
                sessionRepository.findByTokenHash(hash(rawToken)).filter(s -> s.isActive(now));
        if (byHash.isPresent()) {
            return byHash;
        }
        // Legacy dual-lookup: older cookies stored the session UUID itself.
        try {
            UUID legacyId = UUID.fromString(rawToken.trim());
            return sessionRepository.findById(legacyId).filter(s -> s.isActive(now));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    @Transactional(readOnly = true)
    public Optional<UUID> resolveUserId(String rawToken) {
        return resolve(rawToken).map(Session::getUserId);
    }

    /** @deprecated use {@link #resolveUserId(String)} */
    @Transactional(readOnly = true)
    public Optional<UUID> resolveUserId(UUID token) {
        return token == null ? Optional.empty() : resolveUserId(token.toString());
    }

    /** @deprecated use {@link #resolve(String)} */
    @Transactional(readOnly = true)
    public Optional<Session> resolve(UUID token) {
        return token == null ? Optional.empty() : resolve(token.toString());
    }

    @Mutation
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        Optional<Session> session = sessionRepository.findByTokenHash(hash(rawToken));
        if (session.isEmpty()) {
            try {
                session = sessionRepository.findById(UUID.fromString(rawToken.trim()));
            } catch (IllegalArgumentException ex) {
                return;
            }
        }
        session.ifPresent(s -> {
            if (!s.isRevoked()) {
                s.setRevoked(true);
                sessionRepository.save(s);
            }
        });
    }

    /** @deprecated use {@link #revoke(String)} */
    @Mutation
    public void revoke(UUID token) {
        if (token != null) {
            revoke(token.toString());
        }
    }

    static String hash(String rawToken) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 digest algorithm is unavailable", ex);
        }
    }
}
