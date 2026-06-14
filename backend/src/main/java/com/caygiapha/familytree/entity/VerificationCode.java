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
 * A one-time verification code issued for sign-up, sign-in, or node claiming
 * (Requirements 1.3, 1.4, 1.8, 2.2, 2.6, 2.7, 11.4, 11.5).
 *
 * <p>Maps the {@code verification_codes} table from {@code V1__initial_schema.sql}. The plaintext
 * 6-digit code is <strong>never</strong> stored; only a salted hash is persisted in
 * {@code code_hash}. The {@code purpose} discriminator is one of {@code signup}, {@code signin},
 * {@code claim}; account-scoped purposes carry a {@code user_id} while claim invitations carry a
 * {@code person_id}.
 *
 * <p>Lifecycle fields:
 * <ul>
 *   <li>{@code issued_at} / {@code expires_at} — the validity window (300s auth, 900s claim). Once
 *       a sign-up code reaches the failed-attempt limit, {@code expires_at} is repurposed as the
 *       account lockout deadline ({@code now + 900s}); see
 *       {@link com.caygiapha.familytree.service.VerificationCodeService}.</li>
 *   <li>{@code attempts} — count of failed (non-matching) submissions; the issued code is locked /
 *       invalidated once this reaches the limit.</li>
 *   <li>{@code consumed} — single-use flag; set on a successful verification and used to invalidate
 *       the issued code on sign-in/claim lockout.</li>
 * </ul>
 *
 * <p>Foreign keys ({@code user_id}, {@code person_id}) are mapped as plain nullable {@link UUID}
 * columns rather than entity associations, mirroring the {@link Person}/{@link Relationship}
 * convention in this package.
 */
@Entity
@Table(name = "verification_codes")
public class VerificationCode {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Purpose discriminator; one of {@code signup}, {@code signin}, {@code claim}. */
    @Column(name = "purpose", nullable = false)
    private String purpose;

    /** Owning user for account-scoped (sign-up / sign-in) codes; {@code null} for claim codes. */
    @Column(name = "user_id")
    private UUID userId;

    /** Target person for claim codes; {@code null} for account-scoped codes. */
    @Column(name = "person_id")
    private UUID personId;

    /** Phone number or email address the code was delivered to. */
    @Column(name = "destination", nullable = false)
    private String destination;

    /** Salted hash of the 6-digit code; the plaintext is never persisted. */
    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    /** Issue time. */
    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    /** Validity deadline (issued_at + validity window); repurposed as lockout deadline on lockout. */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Number of failed (non-matching) submissions; locks the code once it reaches the limit. */
    @Column(name = "attempts", nullable = false)
    private int attempts = 0;

    /** Single-use flag; set on successful verification or to invalidate on sign-in/claim lockout. */
    @Column(name = "consumed", nullable = false)
    private boolean consumed = false;

    protected VerificationCode() {
        // Required by JPA.
    }

    public VerificationCode(
            String purpose,
            UUID userId,
            UUID personId,
            String destination,
            String codeHash,
            Instant issuedAt,
            Instant expiresAt) {
        this.purpose = purpose;
        this.userId = userId;
        this.personId = personId;
        this.destination = destination;
        this.codeHash = codeHash;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
    }

    public UUID getId() {
        return id;
    }

    public String getPurpose() {
        return purpose;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getPersonId() {
        return personId;
    }

    public String getDestination() {
        return destination;
    }

    public String getCodeHash() {
        return codeHash;
    }

    public void setCodeHash(String codeHash) {
        this.codeHash = codeHash;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public int getAttempts() {
        return attempts;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    /** Records one failed submission and returns the new attempt count. */
    public int incrementAttempts() {
        return ++this.attempts;
    }

    public boolean isConsumed() {
        return consumed;
    }

    public void setConsumed(boolean consumed) {
        this.consumed = consumed;
    }

    /**
     * @return {@code true} when {@code now} is at or after the {@code expires_at} deadline (the code
     *     is outside its validity window, or — once locked — past its lockout deadline).
     */
    public boolean isExpired(Instant now) {
        return !now.isBefore(expiresAt);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof VerificationCode other)) {
            return false;
        }
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
