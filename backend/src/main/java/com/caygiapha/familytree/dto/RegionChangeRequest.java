package com.caygiapha.familytree.dto;

/**
 * Request body for {@code PATCH /api/v1/trees/{treeId}/region} (Requirements 9.5, 9.6).
 *
 * <p>Carries the new default region for the tree, stored ASCII-keyed as one of {@code Bac},
 * {@code Trung}, or {@code Nam} (displayed Bắc/Trung/Nam). Any other value is rejected by the
 * service and the previously stored region retained (9.6); validation is performed in the domain
 * layer (not bean validation here) so the rejection names the {@code region} field consistently
 * with the rest of the error envelope.
 *
 * @param region the requested region key
 */
public record RegionChangeRequest(String region) {
}
