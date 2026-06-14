package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.Claim;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link Claim} links (Requirements 11.2, 11.6, 11.7).
 *
 * <p>Exposes the lookups the {@code Verification_Service} uses to enforce the already-claimed
 * rejection (11.7) and to back the linked-user edit permission the authorization layer consults
 * (11.6): whether a node is claimed, and whether a given user is the one linked to it.
 */
@Repository
public interface ClaimRepository extends JpaRepository<Claim, UUID> {

    /** The claim linking the given person node to a user, if the node has been claimed. */
    Optional<Claim> findByPersonId(UUID personId);

    /** Whether the given person node is already a {@code Claimed_Node} (11.7). */
    boolean existsByPersonId(UUID personId);

    /** Whether the given user is the one linked to the given claimed node (11.6). */
    boolean existsByPersonIdAndUserId(UUID personId, UUID userId);

    /**
     * Whether the given user is linked (via a {@code Claimed_Node}) to any person in the given tree,
     * used to grant tree-level read access to a family member who is not the owner (Requirement
     * 19.3). Joins claims to persons by id and scopes to the tree.
     */
    @Query("SELECT COUNT(c) > 0 FROM Claim c, Person p "
            + "WHERE p.id = c.personId AND p.treeId = :treeId AND c.userId = :userId")
    boolean existsLinkInTree(@Param("treeId") UUID treeId, @Param("userId") UUID userId);

    /** Delete every claim on any of the given person nodes (account/tree deletion cascade; 22.4). */
    void deleteByPersonIdIn(java.util.Collection<UUID> personIds);

    /** Delete every claim held by a user (account deletion removes their linkages; 22.4). */
    void deleteByUserId(UUID userId);
}
