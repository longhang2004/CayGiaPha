package com.caygiapha.familytree.service;

import java.util.UUID;

/**
 * A conflict surfaced when an {@code Asserted_Relationship} is completed by an unbroken bloodline
 * path but the derived form of address does <strong>not</strong> match the user-provided asserted
 * label (design: <em>Asserted vs Derived Relationships — Upgrade and conflict-detection flow</em>,
 * Requirement 7.5).
 *
 * <p>The conflicting asserted edge is moved to the {@code conflict} derivation state and its stored
 * label is <strong>retained unchanged</strong> until the owner resolves the conflict; this record
 * carries both values so the API response — and ultimately the UI warning — can show the asserted
 * label alongside the derived term for the affected pair.
 *
 * @param sourceId      the asserted edge's source person (the labelled pair's first endpoint)
 * @param targetId      the asserted edge's target person (the labelled pair's second endpoint)
 * @param assertedLabel the user-provided label retained on the edge (7.5)
 * @param derivedTerm   the form of address the completed bloodline path now derives (7.3)
 */
public record ConflictWarning(
        UUID sourceId, UUID targetId, String assertedLabel, String derivedTerm) {
}
