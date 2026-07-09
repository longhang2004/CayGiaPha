package com.caygiapha.familytree.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * An authenticated server-side session established for a {@link User} on successful sign-in
 * (Requirements 2.3, 2.8).
 *
 * <p>The cookie carries a high-entropy opaque token; only its SHA-256 {@code token_hash} is stored.
 * The primary key {@code id} is an internal identifier and is never placed in the cookie.
 */
@Entity
@Table(name = "sessions")
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Owning user (FK to {@code users}). */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** SHA-256 hex of the opaque cookie token; never the raw token. */
    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    /** Creation timestamp; populated by the database default ({@code now()}). */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    /** Expiry deadline; set to {@code created_at + 30 days}. Enforced server-side (2.3). */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Whether the session has been revoked (set on sign-out; 2.8). */
    @Column(name = "revoked", nullable = false)
    private boolean revoked = false;

    /**
     * Raw cookie token, available only immediately after {@link com.caygiapha.familytree.service.SessionService#create}
     * for Set-Cookie. Never persisted.
     */
    @Transient
    private String rawToken;

    protected Session() {
        // Required by JPA.
    }

    public Session(UUID userId, Instant expiresAt, String tokenHash) {
        this.userId = userId;
        this.expiresAt = expiresAt;
        this.tokenHash = tokenHash;
    }

    /** Legacy constructor used by older tests; token hash must be set before persist. */
    public Session(UUID userId, Instant expiresAt) {
        this.userId = userId;
        this.expiresAt = expiresAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public void setTokenHash(String tokenHash) {
        this.tokenHash = tokenHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public void setRevoked(boolean revoked) {
        this.revoked = revoked;
    }

    public String getRawToken() {
        return rawToken;
    }

    public void setRawToken(String rawToken) {
        this.rawToken = rawToken;
    }

    public boolean isExpired(Instant now) {
        return !now.isBefore(expiresAt);
    }

    public boolean isActive(Instant now) {
        return !revoked && !isExpired(now);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Session other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
