package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.AuditLog;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for the append-only {@link AuditLog} (Requirement 25.2). */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
}
