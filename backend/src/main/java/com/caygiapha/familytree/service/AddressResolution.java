package com.caygiapha.familytree.service;

import java.util.Optional;

/**
 * The result of resolving a region-aware <em>form of address</em> from an ego to a target (design:
 * <em>Kinship_Resolver Algorithm — Step 4, Look up the regional term</em>). It is a total result:
 * every request yields exactly one of three explicit outcomes, never an error.
 *
 * <ul>
 *   <li>{@link Status#RESOLVED} — a canonical relation was derived and a dialect {@link #term()} is
 *       defined for the tree's region. (9.3)</li>
 *   <li>{@link Status#ASSERTED} — the two persons are directly joined by an
 *       {@code Asserted_Relationship}; the {@link #term()} is the user-provided stored label,
 *       returned verbatim without any derivation. The asserted edge is never traversed to derive
 *       addresses toward other persons. (6.4)</li>
 *   <li>{@link Status#UNDEFINED_FOR_REGION} — a canonical relation was derived but no term is
 *       defined for it under the tree's region; the resolver signals "undefined for this region"
 *       and the tree's stored region is left unchanged. (9.4)</li>
 *   <li>{@link Status#UNRESOLVED} — the relationship path itself could not be resolved (no path, or
 *       an indeterminate elder/younger distinction), independent of region. (8.5, 8.7)</li>
 * </ul>
 *
 * <p>The underlying {@link CanonicalResolution} is retained for diagnostics and for reasoning about
 * the address-symmetry property (8.6): reversing ego and target swaps the canonical descriptor's
 * up/down counts (and flips the branch order), so the reversed canonical key maps to the inverse
 * term — a descendant term (cháu) one way, the corresponding ascendant term (bác/chú/cô/dì/cậu/
 * ông/bà) the other.
 */
public record AddressResolution(Status status, String term, CanonicalResolution canonical) {

    /** The outcome category of an address resolution. */
    public enum Status {
        /** A dialect term is defined for the derived relation under the tree's region. (9.3) */
        RESOLVED,
        /** The pair is directly joined by an asserted edge; {@code term} is the stored label. (6.4) */
        ASSERTED,
        /** The relation was derived but no term exists for it under the tree's region. (9.4) */
        UNDEFINED_FOR_REGION,
        /** The relationship path could not be resolved (no path or indeterminate order). (8.5, 8.7) */
        UNRESOLVED
    }

    public AddressResolution {
        boolean carriesTerm = status == Status.RESOLVED || status == Status.ASSERTED;
        if (carriesTerm && (term == null || term.isEmpty())) {
            throw new IllegalArgumentException(status + " address requires a non-empty term");
        }
        if (!carriesTerm && term != null) {
            throw new IllegalArgumentException("non-term address must not carry a term");
        }
        // An ASSERTED result is the stored label, not a derived path, so it carries no canonical
        // resolution; every other outcome is the product of derived resolution and retains it.
        if (status == Status.ASSERTED) {
            if (canonical != null) {
                throw new IllegalArgumentException(
                        "ASSERTED address carries no derived canonical result");
            }
        } else if (canonical == null) {
            throw new IllegalArgumentException("address resolution requires its canonical result");
        }
    }

    /** A resolved address carrying the dialect term for the tree's region. (9.3) */
    public static AddressResolution resolved(String term, CanonicalResolution canonical) {
        return new AddressResolution(Status.RESOLVED, term, canonical);
    }

    /**
     * An asserted address: the two persons are directly joined by an {@code Asserted_Relationship}
     * and the stored {@code label} is returned verbatim as the form of address. (6.4)
     */
    public static AddressResolution asserted(String label) {
        return new AddressResolution(Status.ASSERTED, label, null);
    }

    /** The relation was derived but has no term defined under the tree's region. (9.4) */
    public static AddressResolution undefinedForRegion(CanonicalResolution canonical) {
        return new AddressResolution(Status.UNDEFINED_FOR_REGION, null, canonical);
    }

    /** The relationship path could not be resolved at all (no path / indeterminate order). (8.5, 8.7) */
    public static AddressResolution unresolved(CanonicalResolution canonical) {
        return new AddressResolution(Status.UNRESOLVED, null, canonical);
    }

    /** Whether a dialect term was resolved for the tree's region. */
    public boolean isResolved() {
        return status == Status.RESOLVED;
    }

    /** Whether the form of address is the stored label of a direct asserted edge. (6.4) */
    public boolean isAsserted() {
        return status == Status.ASSERTED;
    }

    /** The form of address (derived term or asserted label) when present, otherwise empty. */
    public Optional<String> formOfAddress() {
        return Optional.ofNullable(term);
    }
}
