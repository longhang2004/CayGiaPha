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
 * An invitation code for co-building/collaborating on a family tree.
 */
@Entity
@Table(name = "collaboration_invitations")
public class CollaborationInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "tree_id", nullable = false)
    private UUID treeId;

    @Column(name = "inviter_user_id", nullable = false)
    private UUID inviterUserId;

    @Column(name = "email")
    private String email;

    /** User who requested join via a generic code (phone-only accounts included). */
    @Column(name = "requester_user_id")
    private UUID requesterUserId;

    @Column(name = "code", nullable = false)
    private String code;

    /** Status: pending, approved, rejected, joined */
    @Column(name = "status", nullable = false)
    private String status = "pending";

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    protected CollaborationInvitation() {
        // Required by JPA.
    }

    public CollaborationInvitation(UUID treeId, UUID inviterUserId, String email, String code, Instant expiresAt) {
        this.treeId = treeId;
        this.inviterUserId = inviterUserId;
        this.email = email;
        this.code = code;
        this.expiresAt = expiresAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTreeId() {
        return treeId;
    }

    public UUID getInviterUserId() {
        return inviterUserId;
    }

    public String getEmail() {
        return email;
    }

    public UUID getRequesterUserId() {
        return requesterUserId;
    }

    public void setRequesterUserId(UUID requesterUserId) {
        this.requesterUserId = requesterUserId;
    }

    public String getCode() {
        return code;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof CollaborationInvitation other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
