package com.caygiapha.familytree.security;

import java.util.Optional;
import java.util.UUID;

/**
 * The authenticated principal attached to the current request by the {@link AuthenticationFilter}
 * (design "Request Flow Summary"; Requirements 11.6, 13.4, 13.5).
 *
 * <p>An {@code AuthContext} captures who the caller is — the resolved {@code userId} and the
 * earliest owned tree id ({@code ownedTreeId}, used as a legacy default context). Users may own
 * more than one tree (Requirement 13.2); per-request authorization still uses the target
 * {@code treeId}. The field is absent when the user has not yet created a tree. It deliberately
 * does <em>not</em> carry an owner/linked/neither classification: that classification is relative
 * to a specific target tree/person and is computed on demand by {@link AuthorizationService}.
 *
 * <p>Unauthenticated requests (no/invalid/expired session) carry the {@link #anonymous()} context,
 * so downstream code never has to deal with {@code null}; per-endpoint enforcement decides whether
 * authentication is required.
 */
public final class AuthContext {

    private static final AuthContext ANONYMOUS = new AuthContext(null, null);

    private final UUID userId;
    private final UUID ownedTreeId;

    private AuthContext(UUID userId, UUID ownedTreeId) {
        this.userId = userId;
        this.ownedTreeId = ownedTreeId;
    }

    /** The shared empty context used for unauthenticated requests. */
    public static AuthContext anonymous() {
        return ANONYMOUS;
    }

    /**
     * Build a context for an authenticated user.
     *
     * @param userId      the resolved authenticated user's id (required)
     * @param ownedTreeId the id of the tree the user owns, or {@code null} when they own none yet
     */
    public static AuthContext authenticated(UUID userId, UUID ownedTreeId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required for an authenticated context");
        }
        return new AuthContext(userId, ownedTreeId);
    }

    /** Whether a valid session resolved to a user. */
    public boolean isAuthenticated() {
        return userId != null;
    }

    /**
     * @return the authenticated user's id, or {@code null} when {@link #isAuthenticated()} is false.
     */
    public UUID userId() {
        return userId;
    }

    /** The id of the tree owned by this user, if any. */
    public Optional<UUID> ownedTreeId() {
        return Optional.ofNullable(ownedTreeId);
    }
}
