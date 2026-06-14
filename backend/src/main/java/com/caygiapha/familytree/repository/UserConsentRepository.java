package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.UserConsent;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for {@link UserConsent} rows (Requirement 23.2, 23.4).
 */
@Repository
public interface UserConsentRepository extends JpaRepository<UserConsent, UUID> {

    /** The user's most recent acceptance of the given document type, if any. */
    Optional<UserConsent> findFirstByUserIdAndDocTypeOrderByVersionDesc(
            UUID userId, String docType);

    /** Delete all of a user's consent records (account deletion cascade; 22.4). */
    void deleteByUserId(UUID userId);
}
