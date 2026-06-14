package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.Relationship;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link Relationship} typed edges (Requirement 4.x).
 *
 * <p>Exposes traversal queries by {@code tree_id}, {@code source_id}, {@code target_id}, and the
 * {@code type} discriminator, supporting the graph walks used by the {@code Graph_Store} (e.g.
 * at-most-one-parent and cycle checks) and the {@code Kinship_Resolver} projection.
 */
@Repository
public interface RelationshipRepository extends JpaRepository<Relationship, UUID> {

    /** All edges in a tree. */
    List<Relationship> findByTreeId(UUID treeId);

    /** All edges in a tree of a given type (e.g. all {@code bloodline_father} edges). */
    List<Relationship> findByTreeIdAndType(UUID treeId, String type);

    /** All edges originating from a node. */
    List<Relationship> findBySourceId(UUID sourceId);

    /** All edges pointing at a node. */
    List<Relationship> findByTargetId(UUID targetId);

    /** Outgoing edges of a node of a given type. */
    List<Relationship> findBySourceIdAndType(UUID sourceId, String type);

    /** Incoming edges of a node of a given type (e.g. the father edge of a child). */
    List<Relationship> findByTargetIdAndType(UUID targetId, String type);

    /** Every edge touching a node, in either direction. */
    List<Relationship> findBySourceIdOrTargetId(UUID sourceId, UUID targetId);

    /** Whether a child already has an edge of the given (bloodline) type. */
    boolean existsByTargetIdAndType(UUID targetId, String type);

    /**
     * The direct edge of a given type joining {@code sourceId -> targetId}, if any. Used by the
     * address layer to find a direct {@code asserted} edge whose stored label is the form of
     * address for that specific pair (Requirement 6.4).
     */
    Optional<Relationship> findFirstBySourceIdAndTargetIdAndType(
            UUID sourceId, UUID targetId, String type);
}
