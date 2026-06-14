package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.Claim;
import java.time.Instant;
import java.util.UUID;

/**
 * Response body for {@code POST /api/v1/persons/{personId}/claim/verify} (Requirement 11.2).
 *
 * <p>Confirms that the person node is now a {@code Claimed_Node} linked to the recipient's user
 * account, returning the created claim's identity and the linkage it records.
 *
 * @param claimId   id of the created claim link
 * @param personId  the now-claimed person node
 * @param userId    the linked user account
 * @param claimedAt time the node was claimed
 */
public record ClaimResponse(UUID claimId, UUID personId, UUID userId, Instant claimedAt) {

    /** Project a persisted {@link Claim} into its response form. */
    public static ClaimResponse from(Claim claim) {
        return new ClaimResponse(
                claim.getId(), claim.getPersonId(), claim.getUserId(), claim.getClaimedAt());
    }
}
