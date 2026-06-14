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
 * A versioned legal document — Terms of Service or Privacy Policy (Requirement 23.1). Maps the
 * {@code legal_documents} table from {@code V7}. The current document of a type is the row with the
 * highest {@link #version}.
 */
@Entity
@Table(name = "legal_documents")
public class LegalDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** {@code tos} or {@code privacy}. */
    @Column(name = "doc_type", nullable = false)
    private String docType;

    @Column(name = "version", nullable = false)
    private int version;

    @Column(name = "body", nullable = false)
    private String body;

    @Column(name = "published_at", nullable = false, insertable = false, updatable = false)
    private Instant publishedAt;

    protected LegalDocument() {
        // Required by JPA.
    }

    public UUID getId() {
        return id;
    }

    public String getDocType() {
        return docType;
    }

    public int getVersion() {
        return version;
    }

    public String getBody() {
        return body;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof LegalDocument other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
