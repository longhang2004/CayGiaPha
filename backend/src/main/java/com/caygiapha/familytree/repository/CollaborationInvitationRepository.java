package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.CollaborationInvitation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CollaborationInvitationRepository extends JpaRepository<CollaborationInvitation, UUID> {
    List<CollaborationInvitation> findByTreeId(UUID treeId);
    List<CollaborationInvitation> findByTreeIdAndStatus(UUID treeId, String status);
    Optional<CollaborationInvitation> findByTreeIdAndCode(UUID treeId, String code);
    Optional<CollaborationInvitation> findByCode(String code);
    void deleteByTreeId(UUID treeId);
}
