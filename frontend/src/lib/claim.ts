/**
 * Node invitation & claim-by-code API helpers (task 10.4).
 *
 * Wraps the Verification_Service node-claiming endpoints (design
 * "Verification_Service", Requirements 11.1–11.2):
 *   POST /persons/{personId}/invite        { treeId, destination }
 *   POST /persons/{personId}/claim/verify  { treeId, identifier, code }
 *
 * The owner invites a phone/email to claim an unclaimed node (a 15-minute code
 * is delivered — 11.1). The recipient then submits the code together with the
 * identifier the invitation was sent to, claiming the node (11.2). Errors
 * propagate as the typed {@link ApiError} for field-level reporting (11.3–11.7).
 */

import { api } from "./apiClient";

/** Request body for POST /persons/{personId}/invite (Requirement 11.1). */
export interface InviteInput {
  treeId: string;
  /** The phone number or email the invitation code is delivered to. */
  destination: string;
}

/** Request body for POST /persons/{personId}/claim/verify (Requirement 11.2). */
export interface ClaimVerifyInput {
  treeId: string;
  /** The phone/email the invitation was sent to. */
  identifier: string;
  /** The 6-digit code the recipient received. */
  code: string;
}

/** Result of a successful claim — the node is now linked to the user (11.2). */
export interface ClaimResult {
  personId: string;
  claimed: boolean;
}

/**
 * Owner invites a phone/email to claim an unclaimed node; the backend delivers
 * a 15-minute one-time code (Requirement 11.1). Rejected with an already-claimed
 * message when the node is already a Claimed_Node (11.7).
 */
export function invite(personId: string, input: InviteInput): Promise<void> {
  return api.post<void>(`/persons/${encodeURIComponent(personId)}/invite`, {
    treeId: input.treeId,
    destination: input.destination,
  });
}

/**
 * Recipient submits the invitation code to claim the node (Requirement 11.2).
 * Wrong/expired codes and exhausted attempts are rejected (11.3–11.5).
 */
export function verifyClaim(
  personId: string,
  input: ClaimVerifyInput,
): Promise<ClaimResult> {
  return api.post<ClaimResult>(`/persons/${encodeURIComponent(personId)}/claim/verify`, {
    treeId: input.treeId,
    identifier: input.identifier,
    code: input.code,
  });
}
