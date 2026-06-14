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
 * A link recording that a {@link Person} node has been claimed by — and verified as belonging to —
 * a {@link User} account (Requirements 11.2, 11.6).
 *
 * <p>Maps the {@code claims} table from {@code V1__initial_schema.sql}. A node is claimed by at most
 * one user, enforced by the {@code UNIQUE} constraint on {@code person_id}; a {@code Person} that
 * has a {@code Claim} row is a {@code Claimed_Node}, which the linked user and the tree owner may
 * edit (11.6).
 *
 * <p>Following the {@link Person}/{@link VerificationCode} convention, the foreign keys
 * ({@code person_id}, {@code user_id}) are mapped as plain {@link UUID} columns rather than entity
 * associations, and {@code claimed_at} is populated by the database default ({@code now()}) so it is
 * not insertable/updatable from the entity.
 */
@Entity
@Table(name = "claims")
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** The claimed person node (FK to {@code persons}); UNIQUE — at most one claim per node (11.2). */
    @Column(name = "person_id", nullable = false, updatable = false)
    private UUID personId;

    /** The linked user account (FK to {@code users}) permitted to edit the node (11.2, 11.6). */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** Time the node was claimed; populated by the database default ({@code now()}). */
    @Column(name = "claimed_at", nullable = false, insertable = false, updatable = false)
    private Instant claimedAt;

    protected Claim() {
        // Required by JPA.
    }

    /** Link a person node to the user that has verified ownership of it (11.2). */
    public Claim(UUID personId, UUID userId) {
        this.personId = personId;
        this.userId = userId;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPersonId() {
        return personId;
    }

    public UUID getUserId() {
        return userId;
    }

    public Instant getClaimedAt() {
        return claimedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Claim other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
