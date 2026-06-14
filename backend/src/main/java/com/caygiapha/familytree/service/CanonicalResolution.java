package com.caygiapha.familytree.service;

import java.util.Optional;

/**
 * The result of resolving the canonical kinship relation from an ego to a target (design:
 * <em>Kinship_Resolver Algorithm — Steps 2 &amp; 3</em>). It is a total result: every (ego, target)
 * pair yields either a resolved {@link CanonicalRelation} or an explicit unresolved state, never an
 * error. (Requirements 8.7, 8.5)
 *
 * <ul>
 *   <li>{@link Status#RESOLVED} — a canonical descriptor was derived.</li>
 *   <li>{@link Status#UNRESOLVED_NO_PATH} — no kinship path connects ego and target. (8.7)</li>
 *   <li>{@link Status#UNRESOLVED_INDETERMINATE_ORDER} — a path exists, but a required
 *       elder/younger distinction cannot be made because the involved persons' birth order and
 *       birth year are both absent or equal. (8.5)</li>
 * </ul>
 */
public record CanonicalResolution(Status status, CanonicalRelation relation) {

    /** The outcome category of a resolution. */
    public enum Status {
        RESOLVED,
        UNRESOLVED_NO_PATH,
        UNRESOLVED_INDETERMINATE_ORDER
    }

    public CanonicalResolution {
        if (status == Status.RESOLVED && relation == null) {
            throw new IllegalArgumentException("RESOLVED resolution requires a relation");
        }
        if (status != Status.RESOLVED && relation != null) {
            throw new IllegalArgumentException("unresolved resolution must not carry a relation");
        }
    }

    /** A resolved result carrying the derived canonical descriptor. */
    public static CanonicalResolution resolved(CanonicalRelation relation) {
        return new CanonicalResolution(Status.RESOLVED, relation);
    }

    /** An unresolved result because no kinship path connects ego and target. (8.7) */
    public static CanonicalResolution noPath() {
        return new CanonicalResolution(Status.UNRESOLVED_NO_PATH, null);
    }

    /** An unresolved result because a required elder/younger distinction is indeterminate. (8.5) */
    public static CanonicalResolution indeterminateOrder() {
        return new CanonicalResolution(Status.UNRESOLVED_INDETERMINATE_ORDER, null);
    }

    /** Whether a canonical descriptor was derived. */
    public boolean isResolved() {
        return status == Status.RESOLVED;
    }

    /** Whether the relation could not be resolved (no path or indeterminate order). */
    public boolean isUnresolved() {
        return status != Status.RESOLVED;
    }

    /** The canonical descriptor when {@link #isResolved()}, otherwise empty. */
    public Optional<CanonicalRelation> canonicalRelation() {
        return Optional.ofNullable(relation);
    }
}
