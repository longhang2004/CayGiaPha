package com.caygiapha.familytree.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.UUID;

/**
 * Response body for the change-viewpoint all-addresses endpoint
 * ({@code GET /api/v1/trees/{treeId}/viewpoint/{egoId}/addresses}; Requirements 10.1, 10.2, 10.3).
 *
 * <p>It carries, for a chosen viewpoint ({@code egoId}), the address from that ego toward every
 * other person node in the tree. Each {@link TargetAddress} is either a resolved canonical
 * relation descriptor or, when the relationship path cannot be resolved, the explicit
 * unresolved-relationship indicator (10.3).
 *
 * <p>Until region term lookup (task 3.7) is wired in, a resolved entry exposes the region-agnostic
 * {@link CanonicalDescriptor} (including its {@code canonicalKey}), which is the clean seam for the
 * region layer to attach the dialect term (bác/chú/cô/dì/cậu/…) without changing this contract.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ViewpointAddressesResponse(UUID egoId, List<TargetAddress> addresses) {

    /** The unresolved-relationship indicator value placed on unresolved targets (10.3). */
    public static final String UNRESOLVED_INDICATOR = "unresolved";

    /**
     * The address from the viewpoint toward a single target person.
     *
     * @param personId           the addressed person
     * @param resolved           {@code true} when a canonical relation was derived
     * @param status             the resolution status ({@code RESOLVED},
     *                           {@code UNRESOLVED_NO_PATH}, {@code UNRESOLVED_INDETERMINATE_ORDER})
     * @param unresolvedIndicator the unresolved indicator string, present only when not resolved
     * @param relation           the canonical descriptor, present only when resolved
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record TargetAddress(
            UUID personId,
            boolean resolved,
            String status,
            String unresolvedIndicator,
            CanonicalDescriptor relation) {}

    /**
     * Region-agnostic canonical relation descriptor, mirroring the resolver's
     * {@code CanonicalRelation}. {@code canonicalKey} is the stable encoding used by the region
     * layer (task 3.7) to look up the dialect term.
     */
    public record CanonicalDescriptor(
            int upCount,
            int downCount,
            String side,
            String targetGender,
            String branchOrder,
            boolean spouseHop,
            String canonicalKey) {}
}
