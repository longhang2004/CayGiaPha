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
 * A photo attached to a {@link Person} (Requirement 24). Maps the {@code person_photos} table from
 * {@code V9}. The image bytes live in object storage under {@link #objectKey}; this row holds only
 * the reference and metadata (24.7).
 */
@Entity
@Table(name = "person_photos")
public class PersonPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "person_id", nullable = false)
    private UUID personId;

    /** Storage key (path) of the image bytes in the object store; never the bytes themselves. */
    @Column(name = "object_key", nullable = false, updatable = false)
    private String objectKey;

    /** {@code image/jpeg}, {@code image/png}, or {@code image/webp}. */
    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "byte_size", nullable = false)
    private long byteSize;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "is_primary", nullable = false)
    private boolean primary = false;

    @Column(name = "photo_year")
    private Integer photoYear;

    @Column(name = "description")
    private String description;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    protected PersonPhoto() {
        // Required by JPA.
    }

    public PersonPhoto(UUID personId, String objectKey, String contentType, long byteSize,
            Integer width, Integer height) {
        this.personId = personId;
        this.objectKey = objectKey;
        this.contentType = contentType;
        this.byteSize = byteSize;
        this.width = width;
        this.height = height;
    }

    public PersonPhoto(UUID personId, String objectKey, String contentType, long byteSize,
            Integer width, Integer height, Integer photoYear, String description) {
        this.personId = personId;
        this.objectKey = objectKey;
        this.contentType = contentType;
        this.byteSize = byteSize;
        this.width = width;
        this.height = height;
        this.photoYear = photoYear;
        this.description = description;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPersonId() {
        return personId;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public String getContentType() {
        return contentType;
    }

    public long getByteSize() {
        return byteSize;
    }

    public Integer getWidth() {
        return width;
    }

    public Integer getHeight() {
        return height;
    }

    public boolean isPrimary() {
        return primary;
    }

    public void setPrimary(boolean primary) {
        this.primary = primary;
    }

    public Integer getPhotoYear() {
        return photoYear;
    }

    public void setPhotoYear(Integer photoYear) {
        this.photoYear = photoYear;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof PersonPhoto other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
