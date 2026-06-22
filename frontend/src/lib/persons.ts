/**
 * Person & relationship editing helpers for the Vietnamese Family Tree frontend.
 *
 * These thin wrappers around {@link api} centralise the request/response shapes
 * for the Graph_Store person and relationship endpoints (design "Graph_Store"),
 * so the person-editing UI components stay declarative. Errors propagate as the
 * typed {@link ApiError} (carrying `field`/`message`) for accessible field-level
 * reporting.
 */

import { api } from "./apiClient";

/** Gender enum stored on a Person node (Requirement 3.2). */
export type Gender = "male" | "female";

/** Per-field visibility setting for sensitive fields (Requirement 14.1). */
export type Visibility = "private" | "public";

/**
 * Relationship edge discriminator (design Data Models / Requirement 4).
 * Derived (solid) edges: bloodline_father, bloodline_mother (5.1), marriage (5.2).
 * Asserted (dashed) edges: asserted (6.1).
 */
export type RelationshipType =
  | "bloodline_father"
  | "bloodline_mother"
  | "marriage"
  | "non_bloodline"
  | "asserted";

export const RELATIONSHIP_TYPE = {
  bloodlineFather: "bloodline_father",
  bloodlineMother: "bloodline_mother",
  marriage: "marriage",
  nonBloodline: "non_bloodline",
  asserted: "asserted",
} as const;

/** Marital status enum for Marriage_Edge (Requirement 4.5). */
export type MaritalStatus = "married" | "divorced" | "deceased";

/** Request body for POST /persons (Requirements 3.1, 3.2, 3.5, 3.6). */
export interface CreatePersonInput {
  displayName: string;
  gender: Gender;
  birthOrder?: number;
  birthYear?: number;
  phone?: string;
  email?: string;
  deathStatus?: boolean;
}

/** Partial edit body for PATCH /persons/{id} (Requirements 3.3, 3.6). */
export interface EditPersonInput {
  displayName?: string;
  gender?: Gender;
  birthOrder?: number;
  birthYear?: number;
  phone?: string;
  email?: string;
  deathStatus?: boolean;
}

/** Partial visibility update for PATCH /persons/{id}/visibility (Requirement 14.1). */
export interface VisibilityInput {
  visMarital?: Visibility;
  visAdoption?: Visibility;
  visDeath?: Visibility;
}

export interface CreatedPerson {
  id: string;
}

/** A single asserted-vs-derived conflict warning (Requirement 7.5). */
export interface ConflictWarning {
  sourceId: string;
  targetId: string;
  assertedLabel: string;
  derivedTerm: string;
}

/** Response body for POST /relationships. */
export interface RelationshipResult {
  id: string;
  treeId: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  maritalStatus?: string;
  socialType?: string;
  assertedLabel?: string;
  /** {derived, asserted, verified, conflict} (Requirement 7.x). */
  derivationState: string;
  /** Present only when an upgrade produced a conflict (Requirement 7.5). */
  conflicts?: ConflictWarning[];
}

/** Create a person in the owner's tree; resolves to the new node id (3.1). */
export function createPerson(input: CreatePersonInput): Promise<CreatedPerson> {
  return api.post<CreatedPerson>("/persons", input);
}

/** Apply a partial edit to a person (3.3); unspecified fields are left unchanged. */
export function editPerson(
  personId: string,
  treeId: string,
  input: EditPersonInput,
): Promise<unknown> {
  return api.patch(
    `/persons/${encodeURIComponent(personId)}?treeId=${encodeURIComponent(treeId)}`,
    input,
  );
}

/** Set per-field visibility for a person's sensitive fields (14.1). */
export function setVisibility(
  personId: string,
  treeId: string,
  input: VisibilityInput,
): Promise<unknown> {
  return api.patch(
    `/persons/${encodeURIComponent(personId)}/visibility?treeId=${encodeURIComponent(treeId)}`,
    input,
  );
}

/** Input for creating a derived (solid) relationship — parent-child or spouse (5.1, 5.2). */
export interface DerivedRelativeInput {
  treeId: string;
  /** One of the derived edge types (bloodline_father/mother or marriage). */
  type: Extract<
    RelationshipType,
    "bloodline_father" | "bloodline_mother" | "marriage"
  >;
  sourceId: string;
  targetId: string;
  /** Optional, marriage edges only. */
  maritalStatus?: MaritalStatus;
}

/** Input for creating an asserted (dashed) relationship by direct kinship label (6.1). */
export interface AssertedRelativeInput {
  treeId: string;
  sourceId: string;
  targetId: string;
  assertedLabel: string;
}

/**
 * Create a derived (solid-line) relationship: a Primitive_Bloodline_Edge or a
 * Marriage_Edge (Requirements 5.1, 5.2). The response may carry upgrade conflict
 * warnings when a newly added bloodline edge completes an asserted pair (7.5).
 */
export function addDerivedRelative(
  input: DerivedRelativeInput,
): Promise<RelationshipResult> {
  return api.post<RelationshipResult>("/relationships", {
    treeId: input.treeId,
    type: input.type,
    sourceId: input.sourceId,
    targetId: input.targetId,
    ...(input.maritalStatus ? { maritalStatus: input.maritalStatus } : {}),
  });
}

/**
 * Create an asserted (dashed-line) relationship from a direct kinship label
 * (Requirement 6.1). Always sends `type: "asserted"` with the label.
 */
export function addAssertedRelative(
  input: AssertedRelativeInput,
): Promise<RelationshipResult> {
  return api.post<RelationshipResult>("/relationships", {
    treeId: input.treeId,
    type: RELATIONSHIP_TYPE.asserted,
    sourceId: input.sourceId,
    targetId: input.targetId,
    assertedLabel: input.assertedLabel,
  });
}
