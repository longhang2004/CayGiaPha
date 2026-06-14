package com.caygiapha.familytree.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

/**
 * A single dialect kinship term keyed by region and canonical relation (Requirement 9, design:
 * <em>Data Models — region_kinship_terms</em>).
 *
 * <p>Maps the {@code region_kinship_terms} configuration table from {@code V1__initial_schema.sql}.
 * The {@code Kinship_Resolver} reduces a path to a {@link com.caygiapha.familytree.service.CanonicalRelation}
 * and forms its {@code canonical_relation} key; this table maps that key, under a given region, to
 * the Vietnamese term used (ông, bà, bác, chú, cô, dì, cậu, anh, chị, em, cháu, …). A missing row
 * means the form of address is "undefined for this region" (9.4).
 *
 * <p>The primary key is the composite {@code (region, canonical_relation)} pair, mapped with an
 * {@link IdClass}. Both key columns are immutable once written ({@code updatable = false}); only
 * {@code term} is mutable. The region domain ({@code Bac}/{@code Trung}/{@code Nam}) is enforced by
 * a database CHECK constraint and the service layer, not by this mapping.
 */
@Entity
@Table(name = "region_kinship_terms")
@IdClass(RegionKinshipTerm.Key.class)
public class RegionKinshipTerm {

    /** Region key; one of {@code Bac}, {@code Trung}, {@code Nam}. (9.1) */
    @Id
    @Column(name = "region", nullable = false, updatable = false)
    private String region;

    /** Canonical-relation key produced by {@code CanonicalRelation#canonicalKey()}. */
    @Id
    @Column(name = "canonical_relation", nullable = false, updatable = false)
    private String canonicalRelation;

    /** The dialect term for this (region, canonical_relation) pair. */
    @Column(name = "term", nullable = false)
    private String term;

    protected RegionKinshipTerm() {
        // Required by JPA.
    }

    /** Map a canonical relation to a dialect term under a region. */
    public RegionKinshipTerm(String region, String canonicalRelation, String term) {
        this.region = region;
        this.canonicalRelation = canonicalRelation;
        this.term = term;
    }

    public String getRegion() {
        return region;
    }

    public String getCanonicalRelation() {
        return canonicalRelation;
    }

    public String getTerm() {
        return term;
    }

    public void setTerm(String term) {
        this.term = term;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof RegionKinshipTerm other)) {
            return false;
        }
        return Objects.equals(region, other.region)
                && Objects.equals(canonicalRelation, other.canonicalRelation);
    }

    @Override
    public int hashCode() {
        return Objects.hash(region, canonicalRelation);
    }

    /**
     * Composite primary key for {@link RegionKinshipTerm}: the {@code (region, canonical_relation)}
     * pair. Field names and types must match the {@code @Id} fields of the entity.
     */
    public static class Key implements Serializable {

        private String region;
        private String canonicalRelation;

        public Key() {
            // Required by JPA.
        }

        public Key(String region, String canonicalRelation) {
            this.region = region;
            this.canonicalRelation = canonicalRelation;
        }

        public String getRegion() {
            return region;
        }

        public String getCanonicalRelation() {
            return canonicalRelation;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Key other)) {
                return false;
            }
            return Objects.equals(region, other.region)
                    && Objects.equals(canonicalRelation, other.canonicalRelation);
        }

        @Override
        public int hashCode() {
            return Objects.hash(region, canonicalRelation);
        }
    }
}
