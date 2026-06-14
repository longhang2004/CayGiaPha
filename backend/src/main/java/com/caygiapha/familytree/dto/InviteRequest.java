package com.caygiapha.familytree.dto;

import java.util.UUID;

/**
 * Request body for {@code POST /api/v1/persons/{personId}/invite} (Requirements 11.1, 11.7).
 *
 * <p>An Owner invites a phone number or email to claim an as-yet-unclaimed person node; the
 * {@code Verification_Service} issues a 15-minute claim code to that {@code destination}. The
 * destination is validated/classified as a Vietnamese phone or email (naming the offending field on
 * rejection).
 *
 * <p>{@code treeId} identifies the owning tree the invited node must belong to. Full owner-identity
 * authorization is wired in by a later task (7.1); for now the tree context is supplied explicitly
 * by the caller, mirroring the {@code PersonController} convention.
 *
 * @param treeId      the tree the invited person node belongs to (required)
 * @param destination the phone number or email the invitation code is sent to (required)
 */
public record InviteRequest(UUID treeId, String destination) {
}
