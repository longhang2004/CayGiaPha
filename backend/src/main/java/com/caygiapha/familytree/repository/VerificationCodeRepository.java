package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.VerificationCode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link VerificationCode} rows
 * (Requirements 1.4, 1.8, 2.2, 2.6, 2.7, 11.4, 11.5).
 *
 * <p>Exposes lookups by {@code (purpose, user_id)} for account-scoped sign-up/sign-in codes and by
 * {@code (purpose, person_id)} for claim invitations, used by the {@code Verification_Service} to
 * locate the active code for a target and to invalidate prior unconsumed codes when reissuing.
 */
@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {

    /** Codes of a purpose targeting an account, newest first. */
    List<VerificationCode> findByPurposeAndUserIdOrderByIssuedAtDesc(String purpose, UUID userId);

    /** Codes of a purpose targeting a person (claim), newest first. */
    List<VerificationCode> findByPurposeAndPersonIdOrderByIssuedAtDesc(String purpose, UUID personId);

    /** The most recently issued, not-yet-consumed code for an account-scoped purpose. */
    Optional<VerificationCode> findFirstByPurposeAndUserIdAndConsumedFalseOrderByIssuedAtDesc(
            String purpose, UUID userId);

    /** The most recently issued, not-yet-consumed claim code for a person. */
    Optional<VerificationCode> findFirstByPurposeAndPersonIdAndConsumedFalseOrderByIssuedAtDesc(
            String purpose, UUID personId);

    /** All not-yet-consumed codes of a purpose for an account (used to invalidate on reissue). */
    List<VerificationCode> findByPurposeAndUserIdAndConsumedFalse(String purpose, UUID userId);

    /** All not-yet-consumed claim codes for a person (used to invalidate on reissue). */
    List<VerificationCode> findByPurposeAndPersonIdAndConsumedFalse(String purpose, UUID personId);

    /** Delete all codes targeting a user (account deletion cascade; 22.4). */
    void deleteByUserId(UUID userId);

    /** Delete all claim codes targeting any of the given persons (tree deletion cascade; 22.4). */
    void deleteByPersonIdIn(java.util.Collection<UUID> personIds);
}
