package com.caygiapha.familytree.service;

/**
 * The canonical kinship-relation descriptor (design: <em>Kinship_Resolver Algorithm — Step 3,
 * Derive the canonical relation</em>). It captures exactly the facts that determine the Vietnamese
 * form of address between an ego and a target, reduced from the shortest kinship path:
 *
 * <pre>
 * CanonicalRelation {
 *   upCount:      generations up from ego to the meeting (branch) node
 *   downCount:    generations down from the meeting node to the target's blood endpoint
 *   side:         PATERNAL | MATERNAL | SELF — side of the branch leaving ego's lineage
 *   targetGender: MALE | FEMALE
 *   branchOrder:  ELDER | YOUNGER | SELF | UNKNOWN — birth-order of the two siblings at the branch
 *   spouseHop:    true when the target is reached via a marriage edge at the end
 * }
 * </pre>
 *
 * <p>This descriptor is region-agnostic: turning it into a dialect term (bác/chú/cô/dì/cậu/…) is a
 * later, pure-lookup concern (task 3.7). {@link #canonicalKey()} provides a stable encoding that is
 * the clean seam for that region lookup. (Requirements 8.2, 8.3, 8.4)
 */
public record CanonicalRelation(
        int upCount,
        int downCount,
        Side side,
        Gender targetGender,
        BranchOrder branchOrder,
        boolean spouseHop) {

    /** Lineage side of the branch leaving ego's direct line toward the target. (8.3) */
    public enum Side {
        /** The branch leaves via a father link (e.g. bác/chú). */
        PATERNAL,
        /** The branch leaves via a mother link (e.g. cậu). */
        MATERNAL,
        /** No branch leaves ego's line (direct ancestor/descendant, spouse, or ego itself). */
        SELF
    }

    /** Gender of the target person. (8.2) */
    public enum Gender {
        MALE,
        FEMALE;

        /** Map a stored person {@code gender} string ({@code male}/{@code female}) to this enum. */
        public static Gender fromString(String gender) {
            if (gender == null) {
                return null;
            }
            return switch (gender.trim().toLowerCase()) {
                case "male" -> MALE;
                case "female" -> FEMALE;
                default -> null;
            };
        }
    }

    /**
     * Birth-order relationship of the relative's connecting ancestor to ego's connecting parent at
     * the branch point. (8.4, 8.5)
     */
    public enum BranchOrder {
        /** The relative's connecting ancestor was born before ego's connecting parent. */
        ELDER,
        /** The relative's connecting ancestor was born after ego's connecting parent. */
        YOUNGER,
        /** No sibling branch applies (direct lineage, spouse, or ego itself). */
        SELF,
        /** A sibling branch exists but elder/younger cannot be distinguished. (8.5) */
        UNKNOWN
    }

    /** Whether this descriptor has a sibling branch whose elder/younger distinction is required. */
    public boolean hasSiblingBranch() {
        return upCount >= 1 && downCount >= 1;
    }

    /**
     * A stable string encoding of the descriptor, used as the {@code canonical_relation} key for
     * region-term lookup (task 3.7). The encoding is deterministic and order-independent of how the
     * descriptor was derived.
     */
    public String canonicalKey() {
        return "u" + upCount
                + ":d" + downCount
                + ":" + side
                + ":" + targetGender
                + ":" + branchOrder
                + ":s" + (spouseHop ? 1 : 0);
    }
}
