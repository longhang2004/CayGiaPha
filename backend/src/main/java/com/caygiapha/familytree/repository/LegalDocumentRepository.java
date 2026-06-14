package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.LegalDocument;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for {@link LegalDocument} rows (Requirement 23.1). The current document of a type is
 * the highest-versioned row.
 */
@Repository
public interface LegalDocumentRepository extends JpaRepository<LegalDocument, UUID> {

    /** The current (highest-version) document of the given type, if any. */
    Optional<LegalDocument> findFirstByDocTypeOrderByVersionDesc(String docType);
}
