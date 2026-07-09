package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.Session;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link Session} aggregates (Requirements 2.3, 2.8).
 *
 * <p>Lookups use {@code token_hash} for cookie validation; {@code findByUserId} backs account
 * deletion (Requirement 22.4).
 */
@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    Optional<Session> findByTokenHash(String tokenHash);

    List<Session> findByUserId(UUID userId);
}
