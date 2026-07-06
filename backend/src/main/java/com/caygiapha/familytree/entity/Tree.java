package com.caygiapha.familytree.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * A family tree owned by exactly one {@link User} (Requirements 9.2, 13.1, 13.2).
 *
 * <p>Maps the {@code trees} table from {@code V1__initial_schema.sql} plus later migrations.
 *
 * <p>{@code region} is stored ASCII-keyed (one of {@code Bac}/{@code Trung}/{@code Nam}, displayed
 * as Bắc/Trung/Nam) and defaults to {@link #DEFAULT_REGION} ({@code Bac}) when the owner does not
 * specify one (9.2). The {@code owner_user_id} foreign key is mapped as a plain {@link UUID} column
 * rather than an entity association, mirroring the {@link Person}/{@link VerificationCode}
 * convention in this package.
 */
@Entity
@Table(name = "trees")
public class Tree {

    /** Default region assigned to a new tree when the owner does not specify one (Bắc). (9.2) */
    public static final String DEFAULT_REGION = "Bac";

    /**
     * The complete set of valid region keys, stored ASCII as {@code Bac}/{@code Trung}/{@code Nam}
     * and displayed as Bắc/Trung/Nam (9.1). A region-change request carrying any other value is
     * rejected and the previously stored region retained (9.6). Insertion-ordered to give a stable
     * iteration order for the regional-coverage check (9.7).
     */
    public static final List<String> VALID_REGIONS = List.of("Bac", "Trung", "Nam");

    private static final Set<String> VALID_REGION_SET = Set.of("Bac", "Trung", "Nam");

    /** Whether {@code region} is one of the three accepted region keys (9.1, 9.6). */
    public static boolean isValidRegion(String region) {
        return region != null && VALID_REGION_SET.contains(region);
    }

    /** Default sharing mode for a new tree: only the owner and linked users may read it. (19.1) */
    public static final String DEFAULT_SHARING = "private";

    /**
     * The complete set of valid tree sharing modes (Requirement 19.1):
     * <ul>
     *   <li>{@code private} — only the owner and linked claimed-node users may read (default);</li>
     *   <li>{@code link} — additionally, anyone presenting a valid share token may read;</li>
     *   <li>{@code public} — any authenticated user may read.</li>
     * </ul>
     */
    public static final List<String> VALID_SHARING = List.of("private", "link", "public");

    private static final Set<String> VALID_SHARING_SET = Set.of("private", "link", "public");

    /** Whether {@code sharing} is one of the three accepted sharing modes (19.1). */
    public static boolean isValidSharing(String sharing) {
        return sharing != null && VALID_SHARING_SET.contains(sharing);
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Owning user (FK to {@code users}); UNIQUE — at most one tree per user (13.2). */
    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;

    /** Regional dialect setting; one of {@code Bac}, {@code Trung}, {@code Nam}. */
    @Column(name = "region", nullable = false)
    private String region = DEFAULT_REGION;

    /** User-facing tree name added when multiple trees per account became supported. */
    @Column(name = "name", nullable = false)
    private String name = "Cây Gia Phả";

    /** Read-sharing mode; one of {@code private}, {@code link}, {@code public}. (19.1) */
    @Column(name = "sharing", nullable = false)
    private String sharing = DEFAULT_SHARING;

    /** Whether Living_Person details are redacted from non-privileged viewers. (20.4) */
    @Column(name = "living_redaction", nullable = false)
    private boolean livingRedaction = true;

    /** Creation timestamp; populated by the database default ({@code now()}). */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    protected Tree() {
        // Required by JPA.
    }

    /** Create a tree owned by the given user with the default region (Bắc). (9.2, 13.1) */
    public Tree(UUID ownerUserId) {
        this(ownerUserId, DEFAULT_REGION);
    }

    /** Create a tree owned by the given user with an explicit region. */
    public Tree(UUID ownerUserId, String region) {
        this(ownerUserId, region, "Cây Gia Phả");
    }

    public Tree(UUID ownerUserId, String region, String name) {
        this.ownerUserId = ownerUserId;
        this.region = region;
        setName(name);
    }

    public UUID getId() {
        return id;
    }

    public UUID getOwnerUserId() {
        return ownerUserId;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name == null || name.isBlank() ? "Cây Gia Phả" : name.trim();
    }

    public String getSharing() {
        return sharing;
    }

    public void setSharing(String sharing) {
        this.sharing = sharing;
    }

    public boolean isLivingRedaction() {
        return livingRedaction;
    }

    public void setLivingRedaction(boolean livingRedaction) {
        this.livingRedaction = livingRedaction;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Tree other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
