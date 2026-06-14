package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.TreeShareToken;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link TreeShareToken} rows (Requirement 19.4, 19.5).
 *
 * <p>Supports two flows: resolving a presented token to its (active) row by hash for "link" read
 * access (19.4), and listing a tree's active tokens so issuing a new token can revoke the prior one
 * (19.5).
 */
@Repository
public interface TreeShareTokenRepository extends JpaRepository<TreeShareToken, UUID> {

    /** The active (non-revoked) token row for a presented token hash, if any. (19.4) */
    Optional<TreeShareToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);

    /** All currently active tokens for a tree (used to revoke the prior token on re-issue). (19.5) */
    List<TreeShareToken> findByTreeIdAndRevokedAtIsNull(UUID treeId);

    /** Delete all share tokens for a tree (account/tree deletion cascade; 22.4). */
    void deleteByTreeId(UUID treeId);
}
