package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Session;
import com.caygiapha.familytree.repository.SessionRepository;
import java.lang.reflect.Field;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link SessionService}: 30-day session creation (2.3), hashed token at rest,
 * server-side expiry/revocation (2.3, 2.8), and idempotent revocation (2.8).
 */
class SessionServiceTest {

    private static final Instant NOW = Instant.parse("2024-01-01T00:00:00Z");
    private static final UUID USER_ID = UUID.randomUUID();

    private SessionService serviceAt(Instant now, SessionRepository repository) {
        Clock clock = Clock.fixed(now, ZoneOffset.UTC);
        return new SessionService(repository, clock);
    }

    @Test
    void createEstablishesSessionExpiringIn30DaysWithHashedToken() {
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.save(any(Session.class))).thenAnswer(echoWithId());
        SessionService service = serviceAt(NOW, repository);

        Session session = service.create(USER_ID);

        assertThat(session.getUserId()).isEqualTo(USER_ID);
        assertThat(session.getExpiresAt()).isEqualTo(NOW.plus(Duration.ofDays(30)));
        assertThat(session.isRevoked()).isFalse();
        assertThat(session.getId()).isNotNull();
        assertThat(session.getRawToken()).isNotBlank();
        assertThat(session.getTokenHash()).isEqualTo(SessionService.hash(session.getRawToken()));
        assertThat(session.getTokenHash()).isNotEqualTo(session.getRawToken());
    }

    @Test
    void resolveReturnsUserForAnActiveSession() {
        String rawToken = "opaque-session-token";
        Session session = activeSession(rawToken);
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findByTokenHash(SessionService.hash(rawToken)))
                .thenReturn(Optional.of(session));
        SessionService service = serviceAt(NOW, repository);

        assertThat(service.resolve(rawToken)).contains(session);
        assertThat(service.resolveUserId(rawToken)).contains(USER_ID);
    }

    @Test
    void resolveRejectsAnExpiredSession() {
        String rawToken = "expired-token";
        Session session = new Session(USER_ID, NOW.plus(Duration.ofDays(30)), SessionService.hash(rawToken));
        setId(session, UUID.randomUUID());
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findByTokenHash(SessionService.hash(rawToken)))
                .thenReturn(Optional.of(session));
        SessionService service = serviceAt(NOW.plus(Duration.ofDays(30)), repository);

        assertThat(service.resolveUserId(rawToken)).isEmpty();
    }

    @Test
    void resolveRejectsARevokedSession() {
        String rawToken = "revoked-token";
        Session session = activeSession(rawToken);
        session.setRevoked(true);
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findByTokenHash(SessionService.hash(rawToken)))
                .thenReturn(Optional.of(session));
        SessionService service = serviceAt(NOW, repository);

        assertThat(service.resolveUserId(rawToken)).isEmpty();
    }

    @Test
    void resolveReturnsEmptyForUnknownOrNullToken() {
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.empty());
        SessionService service = serviceAt(NOW, repository);

        assertThat(service.resolveUserId("unknown")).isEmpty();
        assertThat(service.resolve((String) null)).isEmpty();
    }

    @Test
    void resolveAcceptsLegacyUuidCookie() {
        UUID legacyId = UUID.randomUUID();
        Session session = new Session(USER_ID, NOW.plus(Duration.ofDays(30)), "legacy-hash");
        setId(session, legacyId);
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findByTokenHash(SessionService.hash(legacyId.toString())))
                .thenReturn(Optional.empty());
        when(repository.findById(legacyId)).thenReturn(Optional.of(session));
        SessionService service = serviceAt(NOW, repository);

        assertThat(service.resolveUserId(legacyId.toString())).contains(USER_ID);
    }

    @Test
    void revokeMarksSessionRevoked() {
        String rawToken = "to-revoke";
        Session session = activeSession(rawToken);
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findByTokenHash(SessionService.hash(rawToken)))
                .thenReturn(Optional.of(session));
        SessionService service = serviceAt(NOW, repository);

        service.revoke(rawToken);

        assertThat(session.isRevoked()).isTrue();
        verify(repository).save(session);
    }

    @Test
    void revokeIsANoOpForUnknownToken() {
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.empty());
        SessionService service = serviceAt(NOW, repository);

        service.revoke("unknown");
        service.revoke((String) null);

        verify(repository, never()).save(any());
    }

    private static Session activeSession(String rawToken) {
        Session session =
                new Session(USER_ID, NOW.plus(Duration.ofDays(30)), SessionService.hash(rawToken));
        setId(session, UUID.randomUUID());
        session.setRawToken(rawToken);
        return session;
    }

    private static org.mockito.stubbing.Answer<Session> echoWithId() {
        return invocation -> {
            Session s = invocation.getArgument(0);
            if (s.getId() == null) {
                setId(s, UUID.randomUUID());
            }
            return s;
        };
    }

    private static void setId(Session session, UUID id) {
        try {
            Field field = Session.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(session, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
