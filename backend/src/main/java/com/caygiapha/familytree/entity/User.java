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
 * A login account belonging to a real human who authenticates with the {@code Auth_Service}
 * (Requirements 1.1, 1.2, 1.5, 1.6, 1.9, 2.x, 13.1).
 *
 * <p>Maps the {@code users} table from {@code V1__initial_schema.sql}. Exactly one of
 * {@code phone}/{@code email} identifies the account (the schema enforces "at least one present"
 * and partial-unique indexes on each non-null value). A freshly created account is
 * {@code verified = false} (1.5) and is flipped to {@code true} only once the sign-up verification
 * code is accepted (Task 6.5 / Requirement 13.1).
 *
 * <p>Following the {@link Person}/{@link VerificationCode} convention, {@code created_at} is
 * populated by the database default and is not insertable/updatable from the entity.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Vietnamese phone identifier; unique among non-null values. {@code null} for email accounts. */
    @Column(name = "phone")
    private String phone;

    /** Email identifier; unique among non-null values. {@code null} for phone accounts. */
    @Column(name = "email")
    private String email;

    /** Whether the account has completed verification (1.5); flipped true on successful sign-up verify. */
    @Column(name = "verified", nullable = false)
    private boolean verified = false;

    /** Creation timestamp; populated by the database default ({@code now()}). */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    protected User() {
        // Required by JPA.
    }

    private User(String phone, String email) {
        this.phone = phone;
        this.email = email;
    }

    /** Create an unverified account identified by a Vietnamese phone number. */
    public static User withPhone(String phone) {
        return new User(phone, null);
    }

    /** Create an unverified account identified by an email address. */
    public static User withEmail(String email) {
        return new User(null, email);
    }

    public UUID getId() {
        return id;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof User other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
