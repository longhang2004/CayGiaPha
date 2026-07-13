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
  treeId: string;
  displayName: string;
  gender: Gender;
  birthOrder?: number;
  birthYear?: number;
  phone?: string;
  email?: string;
  deathStatus?: boolean;
  deathDay?: number;
  deathMonth?: number;
  deathYear?: number;
  deathCalendar?: string;
  deathLunarLeap?: boolean;
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
  deathDay?: number;
  deathMonth?: number;
  deathYear?: number;
  deathCalendar?: string;
  deathLunarLeap?: boolean;
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

export interface CreateRelativeWithPersonInput {
  treeId: string;
  person: Omit<CreatePersonInput, "treeId">;
  relationship: {
    type: RelationshipType;
    existingPersonId: string;
    newPersonPosition: "source" | "target";
    maritalStatus?: MaritalStatus;
    socialType?: string;
    assertedLabel?: string;
  };
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

export interface CreatedRelative {
  personId: string;
  relationship: RelationshipResult;
}

/** Create a person in the explicitly selected editable tree; resolves to the new node id (3.1). */
export function createPerson(input: CreatePersonInput): Promise<CreatedPerson> {
  return api.post<CreatedPerson>("/persons", input);
}

/** Atomically create a new person and its primitive/asserted edge in one tree transaction. */
export function createRelativeWithPerson(
  input: CreateRelativeWithPersonInput,
): Promise<CreatedRelative> {
  return api.post<CreatedRelative>(
    `/trees/${encodeURIComponent(input.treeId)}/relatives`,
    { person: input.person, relationship: input.relationship },
  );
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

export function updateRelationship(
  relationshipId: string,
  treeId: string,
  input: { maritalStatus?: MaritalStatus; socialType?: string; assertedLabel?: string },
): Promise<RelationshipResult> {
  return api.patch<RelationshipResult>(
    `/relationships/${encodeURIComponent(relationshipId)}`,
    { treeId, ...input },
  );
}

export function deleteRelationship(relationshipId: string, treeId: string): Promise<void> {
  return api.del(
    `/relationships/${encodeURIComponent(relationshipId)}?treeId=${encodeURIComponent(treeId)}`,
  );
}

export interface UpcomingEvent {
  personId: string;
  displayName: string;
  relationship: string;
  eventType: string;
  eventDate: string; // Gregorian solar date, e.g. "2024-04-18"
  originalDate: string; // Vietnamese lunar or solar label, e.g. "10/03 Âm lịch"
  daysRemaining: number;
}

export interface InAppReminder {
  id: string;
  userId: string;
  personId: string;
  title: string;
  content: string;
  daysUntil: number;
  anniversaryDate: string;
  isRead: boolean;
  createdAt: string;
}

export interface LunarConversionResult {
  day: number;
  month: number;
  year: number;
  leap: boolean;
  formatted: string;
}

export interface SolarConversionResult {
  day: number;
  month: number;
  year: number;
  formatted: string;
}

export function getUpcomingEvents(treeId: string): Promise<UpcomingEvent[]> {
  return api.get<UpcomingEvent[]>(`/trees/${encodeURIComponent(treeId)}/upcoming-events`);
}

export function getReminders(): Promise<InAppReminder[]> {
  return api.get<InAppReminder[]>("/reminders");
}

export function markReminderAsRead(id: string): Promise<InAppReminder> {
  return api.patch<InAppReminder>(`/reminders/${encodeURIComponent(id)}/read`, {});
}

export function deleteReminder(id: string): Promise<void> {
  return api.del(`/reminders/${encodeURIComponent(id)}`);
}

export function triggerReminderCheck(): Promise<number> {
  return api.post<number>("/reminders/trigger-check", {});
}

export function convertSolarToLunar(day: number, month: number, year: number): Promise<LunarConversionResult> {
  return api.get<LunarConversionResult>(`/calendar/solar-to-lunar?day=${day}&month=${month}&year=${year}`);
}

export function convertLunarToSolar(day: number, month: number, year: number, leap: boolean): Promise<SolarConversionResult> {
  return api.get<SolarConversionResult>(`/calendar/lunar-to-solar?day=${day}&month=${month}&year=${year}&leap=${leap}`);
}
