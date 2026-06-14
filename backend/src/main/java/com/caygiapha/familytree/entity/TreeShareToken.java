package com.caygiapha.familytree.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * An unguessable share token granting "link" read access to a tree (Requirement 19.4, 19.5).
 *
 * <p>Maps the {@code tree_share_tokens} table from {@code V5}. Only the SHA-256 hash of the token
 * is stored ({@code token_hash}); the plaintext is shown to the owner exactly once at creation. A
 * token is <em>active</em> while {@link #revokedAt} is {@code null}; revocation is a soft delete so
 * the row remains for audit. The application keeps at most one active token per tree (issuing a new
 * one revokes the prior active token).
 */
@Entity
@Table(name = "tree_share_tokens")
public class TreeShareToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** The tree this token grants read access to. */
    @Column(name = "tree_id", nullable = false)
    private UUID treeId;

    /** SHA-256 hash (hex) of the plaintext token; the token itself is never stored. */
    @Column(name = "token_hash", nullable = false, updatable = false)
    private String tokenHash;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    /** When the token was revoked, or {@code null} while active. */
    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected TreeShareToken() {
        // Required by JPA.
    }

    public TreeShareToken(UUID treeId, String tokenHash) {
        this.treeId = treeId;
        this.tokenHash = tokenHash;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTreeId() {
        return treeId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }

    /** Whether the token is still active (not revoked). */
    public boolean isActive() {
        return revokedAt == null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof TreeShareToken other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
