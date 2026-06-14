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
 * A user's acceptance of a specific legal-document version (Requirement 23.2). Maps the
 * {@code user_consents} table from {@code V7}.
 */
@Entity
@Table(name = "user_consents")
public class UserConsent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** {@code tos} or {@code privacy}. */
    @Column(name = "doc_type", nullable = false)
    private String docType;

    @Column(name = "version", nullable = false)
    private int version;

    @Column(name = "accepted_at", nullable = false, insertable = false, updatable = false)
    private Instant acceptedAt;

    protected UserConsent() {
        // Required by JPA.
    }

    public UserConsent(UUID userId, String docType, int version) {
        this.userId = userId;
        this.docType = docType;
        this.version = version;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getDocType() {
        return docType;
    }

    public int getVersion() {
        return version;
    }

    public Instant getAcceptedAt() {
        return acceptedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof UserConsent other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
