package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
 * Unit tests for {@link SessionService}: 30-day session creation (2.3), server-side
 * expiry/revocation enforcement during validation (2.3, 2.8), and idempotent revocation on
 * sign-out (2.8).
 *
 * <p>A fixed {@link Clock} drives the validity window deterministically.
 */
class SessionServiceTest {

    private static final Instant NOW = Instant.parse("2024-01-01T00:00:00Z");
    private static final UUID USER_ID = UUID.randomUUID();

    private SessionService serviceAt(Instant now, SessionRepository repository) {
        Clock clock = Clock.fixed(now, ZoneOffset.UTC);
        return new SessionService(repository, clock);
    }

    @Test
    void createEstablishesSessionExpiringIn30Days() {
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.save(any(Session.class))).thenAnswer(echoWithId());
        SessionService service = serviceAt(NOW, repository);

        Session session = service.create(USER_ID);

        assertThat(session.getUserId()).isEqualTo(USER_ID);
        assertThat(session.getExpiresAt()).isEqualTo(NOW.plus(Duration.ofDays(30))); // 2.3
        assertThat(session.isRevoked()).isFalse();
        assertThat(session.getId()).isNotNull();
    }

    @Test
    void resolveReturnsUserForAnActiveSession() {
        Session session = activeSession();
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findById(session.getId())).thenReturn(Optional.of(session));
        SessionService service = serviceAt(NOW, repository);

        assertThat(service.resolve(session.getId())).contains(session);
        assertThat(service.resolveUserId(session.getId())).contains(USER_ID);
    }

    @Test
    void resolveRejectsAnExpiredSession() {
        // 2.3 — expiry is enforced server-side; checking at/after the deadline yields nothing.
        Session session = new Session(USER_ID, NOW.plus(Duration.ofDays(30)));
        setId(session, session.getId());
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findById(any())).thenReturn(Optional.of(session));
        SessionService service = serviceAt(NOW.plus(Duration.ofDays(30)), repository);

        assertThat(service.resolveUserId(session.getId())).isEmpty();
    }

    @Test
    void resolveRejectsARevokedSession() {
        // 2.8 — a revoked session never authenticates again.
        Session session = activeSession();
        session.setRevoked(true);
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findById(session.getId())).thenReturn(Optional.of(session));
        SessionService service = serviceAt(NOW, repository);

        assertThat(service.resolveUserId(session.getId())).isEmpty();
    }

    @Test
    void resolveReturnsEmptyForUnknownOrNullToken() {
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findById(any())).thenReturn(Optional.empty());
        SessionService service = serviceAt(NOW, repository);

        assertThat(service.resolveUserId(UUID.randomUUID())).isEmpty();
        assertThat(service.resolve(null)).isEmpty();
    }

    @Test
    void revokeMarksSessionRevoked() {
        Session session = activeSession();
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findById(session.getId())).thenReturn(Optional.of(session));
        SessionService service = serviceAt(NOW, repository);

        service.revoke(session.getId());

        assertThat(session.isRevoked()).isTrue(); // 2.8
        verify(repository).save(session);
    }

    @Test
    void revokeIsANoOpForUnknownToken() {
        SessionRepository repository = mock(SessionRepository.class);
        when(repository.findById(any())).thenReturn(Optional.empty());
        SessionService service = serviceAt(NOW, repository);

        service.revoke(UUID.randomUUID());
        service.revoke(null);

        verify(repository, never()).save(any());
    }

    private static Session activeSession() {
        Session session = new Session(USER_ID, NOW.plus(Duration.ofDays(30)));
        setId(session, UUID.randomUUID());
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

    /** Set the JPA-managed id via reflection for test fixtures. */
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
