package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.Session;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link Session} aggregates (Requirements 2.3, 2.8).
 *
 * <p>Sessions are looked up by their opaque token id (the primary key) when validating an
 * authenticated request and when revoking a session on sign-out. The inherited
 * {@link JpaRepository#findById(Object)} provides the token lookup. {@code findByUserId} backs
 * account deletion, which terminates all of a user's sessions (Requirement 22.4).
 */
@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    /** All sessions belonging to a user (used to terminate them on account deletion; 22.4). */
    List<Session> findByUserId(UUID userId);
}
