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
 * A typed, directed edge between two distinct {@link Person} nodes
 * (Requirements 4.1, 4.3, 4.5, 4.6, 4.7).
 *
 * <p>Maps the single typed-edge table {@code relationships} from {@code V1__initial_schema.sql}.
 * The {@code type} column is the discriminator over
 * {@code {bloodline_father, bloodline_mother, marriage, non_bloodline, asserted}}, and the
 * type-specific columns ({@code marital_status}, {@code social_type}, {@code asserted_label}) are
 * nullable, populated only for the matching {@code type}. Allowed-value bounds and the
 * type-conditional nullability are enforced by database CHECK constraints and the service layer.
 *
 * <p>Foreign keys ({@code tree_id}, {@code source_id}, {@code target_id}) are mapped as plain
 * {@link UUID} columns rather than entity associations.
 */
@Entity
@Table(name = "relationships")
public class Relationship {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Owning tree (FK to {@code trees}); edges never cross trees. */
    @Column(name = "tree_id", nullable = false)
    private UUID treeId;

    /**
     * Edge-type discriminator; one of {@code bloodline_father}, {@code bloodline_mother},
     * {@code marriage}, {@code non_bloodline}, {@code asserted}.
     */
    @Column(name = "type", nullable = false)
    private String type;

    /** Source endpoint (parent for bloodline edges). */
    @Column(name = "source_id", nullable = false)
    private UUID sourceId;

    /** Target endpoint (child for bloodline edges). */
    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    /** Marital status for {@code marriage} edges; one of {@code married, divorced, deceased}. */
    @Column(name = "marital_status")
    private String maritalStatus;

    /** Social type for {@code non_bloodline} edges; one of {@code friend, teacher, colleague}. */
    @Column(name = "social_type")
    private String socialType;

    /** User-provided kinship label for {@code asserted} edges; 1-50 characters. */
    @Column(name = "asserted_label")
    private String assertedLabel;

    /**
     * Derivation state; one of {@code derived}, {@code asserted}, {@code verified},
     * {@code conflict}. Defaults to {@code derived}.
     */
    @Column(name = "derivation_state", nullable = false)
    private String derivationState = "derived";

    /** Creation timestamp; populated by the database default ({@code now()}). */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    protected Relationship() {
        // Required by JPA.
    }

    public Relationship(UUID treeId, String type, UUID sourceId, UUID targetId) {
        this.treeId = treeId;
        this.type = type;
        this.sourceId = sourceId;
        this.targetId = targetId;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTreeId() {
        return treeId;
    }

    public void setTreeId(UUID treeId) {
        this.treeId = treeId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public UUID getSourceId() {
        return sourceId;
    }

    public void setSourceId(UUID sourceId) {
        this.sourceId = sourceId;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public String getMaritalStatus() {
        return maritalStatus;
    }

    public void setMaritalStatus(String maritalStatus) {
        this.maritalStatus = maritalStatus;
    }

    public String getSocialType() {
        return socialType;
    }

    public void setSocialType(String socialType) {
        this.socialType = socialType;
    }

    public String getAssertedLabel() {
        return assertedLabel;
    }

    public void setAssertedLabel(String assertedLabel) {
        this.assertedLabel = assertedLabel;
    }

    public String getDerivationState() {
        return derivationState;
    }

    public void setDerivationState(String derivationState) {
        this.derivationState = derivationState;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Relationship other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
