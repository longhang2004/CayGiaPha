package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.Person;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link Person} nodes (Requirement 3.x).
 *
 * <p>Provides tree-scoped lookups used by the {@code Graph_Store} to load and authorize nodes
 * within a single tree.
 */
@Repository
public interface PersonRepository extends JpaRepository<Person, UUID> {

    /** All person nodes belonging to the given tree. */
    List<Person> findByTreeId(UUID treeId);

    /** All deceased person nodes belonging to the given tree. */
    List<Person> findByTreeIdAndDeathStatusTrue(UUID treeId);

    /** A person scoped to a tree (used to verify the node is accessible in the caller's tree). */
    Optional<Person> findByIdAndTreeId(UUID id, UUID treeId);

    /** Whether a person exists within the given tree. */
    boolean existsByIdAndTreeId(UUID id, UUID treeId);

    /** Number of person nodes in a tree. */
    long countByTreeId(UUID treeId);
}
