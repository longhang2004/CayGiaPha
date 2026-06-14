package com.caygiapha.familytree.dto;

import java.util.UUID;

/**
 * Response for {@code POST /api/v1/trees/{treeId}/share-token} (Requirement 19.5): the newly issued
 * plaintext share token, returned exactly once. Only its hash is persisted, so the token cannot be
 * retrieved again; the owner must re-issue (revoking this one) if it is lost.
 *
 * @param treeId the tree the token grants "link" read access to
 * @param token  the plaintext share token (shown only here)
 */
public record ShareTokenResponse(UUID treeId, String token) {
}
