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
 * An authenticated server-side session established for a {@link User} on successful sign-in
 * (Requirements 2.3, 2.8).
 *
 * <p>Maps the {@code sessions} table from {@code V1__initial_schema.sql}. The primary key
 * {@code id} doubles as the <strong>opaque session token</strong>: it is a random UUID (≥128 bits)
 * that is placed in the {@code HttpOnly}/{@code Secure}/{@code SameSite} session cookie and kept
 * server-side. Possession of the token id is what proves the session.
 *
 * <p>Lifecycle:
 * <ul>
 *   <li>{@code created_at} — populated by the database default ({@code now()}); not
 *       insertable/updatable, mirroring the {@link User}/{@link Tree} convention.</li>
 *   <li>{@code expires_at} — set by the {@code Auth_Service} to {@code now + 30 days} from the
 *       injected clock when the session is created; the 30-day expiry is enforced server-side
 *       (2.3).</li>
 *   <li>{@code revoked} — flipped to {@code true} on sign-out so the session can never authenticate
 *       again (2.8).</li>
 * </ul>
 *
 * <p>The {@code user_id} foreign key is mapped as a plain {@link UUID} column rather than an entity
 * association, mirroring the {@link Tree}/{@link VerificationCode} convention in this package.
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

    /** Creation timestamp; populated by the database default ({@code now()}). */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    /** Expiry deadline; set to {@code created_at + 30 days}. Enforced server-side (2.3). */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Whether the session has been revoked (set on sign-out; 2.8). */
    @Column(name = "revoked", nullable = false)
    private boolean revoked = false;

    protected Session() {
        // Required by JPA.
    }

    /**
     * Create a session for the given user expiring at the supplied deadline.
     *
     * @param userId    the authenticated user the session belongs to
     * @param expiresAt the expiry deadline ({@code created_at + 30 days})
     */
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

    /**
     * @return {@code true} when {@code now} is at or after the {@code expires_at} deadline.
     */
    public boolean isExpired(Instant now) {
        return !now.isBefore(expiresAt);
    }

    /**
     * @return {@code true} when the session can currently authenticate a request: it is neither
     *     revoked nor past its expiry at {@code now}.
     */
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
