package com.caygiapha.familytree.dto;

import java.util.UUID;

/**
 * Request body for {@code POST /api/v1/persons/{personId}/claim/verify} (Requirements 11.2–11.5).
 *
 * <p>An invited recipient submits the 6-digit claim code together with the phone/email identifier
 * the invitation was issued to; on success the {@code Verification_Service} links the person node to
 * the recipient's {@link com.caygiapha.familytree.entity.User} account (11.2). A wrong or expired
 * code leaves the node in its prior unclaimed state (11.3, 11.4).
 *
 * @param treeId     the tree the claimed person node belongs to (required)
 * @param identifier the phone/email of the recipient's account being linked (required)
 * @param code       the submitted 6-digit verification code (required)
 */
public record ClaimVerifyRequest(UUID treeId, String identifier, String code) {
}
