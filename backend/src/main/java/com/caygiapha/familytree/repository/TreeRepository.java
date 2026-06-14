package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.Tree;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link Tree} aggregates (Requirements 9.2, 13.1, 13.2).
 *
 * <p>Exposes owner-scoped lookups used to enforce the one-tree-per-user rule (13.2): before
 * creating a tree on successful verification, the {@code Auth_Service} checks whether the owner
 * already has one.
 */
@Repository
public interface TreeRepository extends JpaRepository<Tree, UUID> {

    /** The tree owned by the given user, if any (at most one per user; 13.2). */
    Optional<Tree> findByOwnerUserId(UUID ownerUserId);

    /** Whether the given user already owns a tree. */
    boolean existsByOwnerUserId(UUID ownerUserId);
}
