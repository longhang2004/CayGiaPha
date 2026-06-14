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
 * A node in the relationship graph representing an individual (Requirements 3.1, 3.2, 3.5, 14.1).
 *
 * <p>Maps the {@code persons} table defined in {@code V1__initial_schema.sql}. Enumerated text
 * domains ({@code gender}, {@code vis_*}) are stored as {@code String}s to mirror the schema's
 * {@code text} columns exactly; their allowed-value bounds are enforced by database CHECK
 * constraints and the service layer (Task 2.2), not by this mapping.
 *
 * <p>The {@code tree_id} foreign key is mapped as a plain {@link UUID} column rather than an
 * association to a {@code Tree} entity, which is outside this task's scope.
 */
@Entity
@Table(name = "persons")
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Owning tree (FK to {@code trees}); edges and nodes never cross trees. */
    @Column(name = "tree_id", nullable = false)
    private UUID treeId;

    /** Display name; 1-100 characters (bound enforced by DB CHECK / service). */
    @Column(name = "display_name", nullable = false)
    private String displayName;

    /** Gender; one of {@code male}, {@code female}. */
    @Column(name = "gender", nullable = false)
    private String gender;

    /** Optional birth order; 1-99 when present. */
    @Column(name = "birth_order")
    private Integer birthOrder;

    /** Optional birth year; >= 1000 (and <= current year, enforced by the service). */
    @Column(name = "birth_year")
    private Integer birthYear;

    /** Whether the person is recorded as deceased. */
    @Column(name = "death_status", nullable = false)
    private boolean deathStatus = false;

    /** Optional adoption status; a sensitive field. */
    @Column(name = "adoption_status")
    private Boolean adoptionStatus;

    /** Visibility of marital status; one of {@code private}, {@code public}. */
    @Column(name = "vis_marital", nullable = false)
    private String visMarital = "private";

    /** Visibility of adoption status; one of {@code private}, {@code public}. */
    @Column(name = "vis_adoption", nullable = false)
    private String visAdoption = "private";

    /** Visibility of death status; one of {@code private}, {@code public}. */
    @Column(name = "vis_death", nullable = false)
    private String visDeath = "private";

    /** Visibility of display name; one of {@code private}, {@code public}. (21.1) */
    @Column(name = "vis_name", nullable = false)
    private String visName = "public";

    /** Visibility of birth year; one of {@code private}, {@code public}. (21.1) */
    @Column(name = "vis_birth_year", nullable = false)
    private String visBirthYear = "public";

    /** Visibility of the primary photo; one of {@code private}, {@code public}. (21.1) */
    @Column(name = "vis_photo", nullable = false)
    private String visPhoto = "private";

    /** Creation timestamp; populated by the database default ({@code now()}). */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    protected Person() {
        // Required by JPA.
    }

    public Person(UUID treeId, String displayName, String gender) {
        this.treeId = treeId;
        this.displayName = displayName;
        this.gender = gender;
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

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public Integer getBirthOrder() {
        return birthOrder;
    }

    public void setBirthOrder(Integer birthOrder) {
        this.birthOrder = birthOrder;
    }

    public Integer getBirthYear() {
        return birthYear;
    }

    public void setBirthYear(Integer birthYear) {
        this.birthYear = birthYear;
    }

    public boolean isDeathStatus() {
        return deathStatus;
    }

    public void setDeathStatus(boolean deathStatus) {
        this.deathStatus = deathStatus;
    }

    public Boolean getAdoptionStatus() {
        return adoptionStatus;
    }

    public void setAdoptionStatus(Boolean adoptionStatus) {
        this.adoptionStatus = adoptionStatus;
    }

    public String getVisMarital() {
        return visMarital;
    }

    public void setVisMarital(String visMarital) {
        this.visMarital = visMarital;
    }

    public String getVisAdoption() {
        return visAdoption;
    }

    public void setVisAdoption(String visAdoption) {
        this.visAdoption = visAdoption;
    }

    public String getVisDeath() {
        return visDeath;
    }

    public void setVisDeath(String visDeath) {
        this.visDeath = visDeath;
    }

    public String getVisName() {
        return visName;
    }

    public void setVisName(String visName) {
        this.visName = visName;
    }

    public String getVisBirthYear() {
        return visBirthYear;
    }

    public void setVisBirthYear(String visBirthYear) {
        this.visBirthYear = visBirthYear;
    }

    public String getVisPhoto() {
        return visPhoto;
    }

    public void setVisPhoto(String visPhoto) {
        this.visPhoto = visPhoto;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Person other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
