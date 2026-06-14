package com.caygiapha.familytree.dto;

import java.util.UUID;

/**
 * Response body for {@code POST /api/v1/auth/signup/verify} (Requirements 13.1, 9.2).
 *
 * <p>On successful verification the account is marked verified and its single tree is created;
 * this confirms the tree creation to the user (13.1) and reports the assigned default region (9.2).
 *
 * @param userId id of the now-verified account
 * @param treeId id of the user's single created tree
 * @param region the tree's assigned region (defaults to {@code Bac})
 */
public record SignUpVerifyResponse(UUID userId, UUID treeId, String region) {
}
