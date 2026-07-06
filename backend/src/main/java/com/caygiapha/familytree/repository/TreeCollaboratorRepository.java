package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.TreeCollaborator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TreeCollaboratorRepository extends JpaRepository<TreeCollaborator, UUID> {
    List<TreeCollaborator> findByTreeId(UUID treeId);
    List<TreeCollaborator> findByUserId(UUID userId);
    Optional<TreeCollaborator> findByTreeIdAndUserId(UUID treeId, UUID userId);
    boolean existsByTreeIdAndUserId(UUID treeId, UUID userId);
    void deleteByTreeId(UUID treeId);
}
