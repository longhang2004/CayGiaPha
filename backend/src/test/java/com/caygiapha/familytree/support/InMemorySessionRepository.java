package com.caygiapha.familytree.support;

import com.caygiapha.familytree.entity.Session;
import com.caygiapha.familytree.repository.SessionRepository;
import java.util.Objects;
import java.util.Optional;

/**
 * In-memory {@link SessionRepository} for Docker-free integration tests.
 */
public class InMemorySessionRepository extends InMemoryRepository<Session>
        implements SessionRepository {

    @Override
    public java.util.List<Session> findByUserId(java.util.UUID userId) {
        return all().stream()
                .filter(s -> Objects.equals(s.getUserId(), userId))
                .toList();
    }

    @Override
    public Optional<Session> findByTokenHash(String tokenHash) {
        if (tokenHash == null) {
            return Optional.empty();
        }
        return all().stream()
                .filter(s -> tokenHash.equals(s.getTokenHash()))
                .findFirst();
    }
}
