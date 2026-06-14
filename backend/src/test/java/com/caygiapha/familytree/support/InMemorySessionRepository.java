package com.caygiapha.familytree.support;

import com.caygiapha.familytree.entity.Session;
import com.caygiapha.familytree.repository.SessionRepository;

/**
 * In-memory {@link SessionRepository} for Docker-free integration tests. All needed behavior
 * (save / findById) is inherited from {@link InMemoryRepository}.
 */
public class InMemorySessionRepository extends InMemoryRepository<Session>
        implements SessionRepository {

    @Override
    public java.util.List<Session> findByUserId(java.util.UUID userId) {
        return all().stream()
                .filter(s -> java.util.Objects.equals(s.getUserId(), userId))
                .toList();
    }
}
