package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.Tree;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link Tree} aggregates (Requirements 9.2, 13.1, 13.2).
 *
 * <p>Exposes owner-scoped lookups. Newer flows allow multiple trees per owner, so callers that need
 * a default context should use the earliest owned tree while list/create endpoints handle all rows.
 */
@Repository
public interface TreeRepository extends JpaRepository<Tree, UUID> {

    /** The earliest tree owned by the given user, used as a legacy default context. */
    Optional<Tree> findFirstByOwnerUserIdOrderByCreatedAtAsc(UUID ownerUserId);

    /** Legacy single-tree lookup retained for older tests and callers. */
    Optional<Tree> findByOwnerUserId(UUID ownerUserId);

    /** All trees owned by the given user. */
    List<Tree> findAllByOwnerUserIdOrderByCreatedAtAsc(UUID ownerUserId);

    /** Whether the given user already owns a tree. */
    boolean existsByOwnerUserId(UUID ownerUserId);
}
