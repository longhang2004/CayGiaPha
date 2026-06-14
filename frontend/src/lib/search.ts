/**
 * Search & filter API helpers for the Vietnamese Family Tree frontend (task 10.4).
 *
 * Thin wrapper over the Search_Service endpoint (design "Search_Service",
 * Requirement 16). The UI builds a {@link SearchRequest} (optional name query,
 * optional address query relative to a viewpoint, and a set of combinable
 * field filters that the backend intersects — AND) and receives the matching
 * persons plus an explicit `noMatches` indication (16.6).
 *
 * Errors propagate as the typed {@link ApiError} from the API client so the
 * search UI can surface field-level messages from the error envelope (16.8).
 */

import { api } from "./apiClient";

/** Person gender filter value (Requirement 3.2 / 16.3). */
export type Gender = "male" | "female";

/** Side relative to the current viewpoint (Requirement 16.3). */
export type Side = "paternal" | "maternal";

/** Claimed-status filter (Requirement 16.3). */
export type ClaimedStatus = "claimed" | "unclaimed";

/**
 * Relationship-type filter (Requirement 16.3). Mirrors the edge discriminator
 * used throughout the graph: bloodline, marriage, asserted, non-bloodline.
 */
export type RelationshipType =
  | "bloodline"
  | "marriage"
  | "asserted"
  | "non_bloodline";

/**
 * The combinable field filters (Requirement 16.3). Every field is optional;
 * supplied filters are intersected server-side (16.4, 16.5). Only defined
 * fields are sent so the backend treats omitted filters as "not applied".
 */
export interface SearchFilters {
  gender?: Gender;
  side?: Side;
  birthYearMin?: number;
  birthYearMax?: number;
  deathStatus?: boolean;
  claimedStatus?: ClaimedStatus;
  relationshipType?: RelationshipType;
}

/** Request body for POST /trees/{treeId}/search (Requirements 16.1–16.4). */
export interface SearchRequest {
  nameQuery?: string;
  addressQuery?: string;
  /** Viewpoint (ego) for address search and side filtering (16.2, 16.3). */
  viewpointId?: string;
  filters?: SearchFilters;
}

/** A single search hit. */
export interface SearchResult {
  personId: string;
  displayName: string;
}

/** Response body for the search endpoint (16.6). */
export interface SearchResponse {
  results: SearchResult[];
  /** True when nothing matched the query + filters (no-matches indication). */
  noMatches: boolean;
}

/**
 * Drop `undefined` / empty-string fields from a filter object so only the
 * filters the user actually set are sent (an empty filter must not constrain
 * the result set — Requirement 16.4/16.5).
 */
export function pruneFilters(filters: SearchFilters): SearchFilters | undefined {
  const cleaned: SearchFilters = {};
  if (filters.gender) cleaned.gender = filters.gender;
  if (filters.side) cleaned.side = filters.side;
  if (filters.birthYearMin !== undefined && !Number.isNaN(filters.birthYearMin)) {
    cleaned.birthYearMin = filters.birthYearMin;
  }
  if (filters.birthYearMax !== undefined && !Number.isNaN(filters.birthYearMax)) {
    cleaned.birthYearMax = filters.birthYearMax;
  }
  if (filters.deathStatus !== undefined) cleaned.deathStatus = filters.deathStatus;
  if (filters.claimedStatus) cleaned.claimedStatus = filters.claimedStatus;
  if (filters.relationshipType) cleaned.relationshipType = filters.relationshipType;
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

/**
 * Build the minimal request body, omitting empty optional fields. Keeping the
 * body lean ensures empty queries/filters are treated as "not supplied" rather
 * than constraining the search.
 */
export function buildSearchBody(request: SearchRequest): SearchRequest {
  const body: SearchRequest = {};
  if (request.nameQuery && request.nameQuery.trim() !== "") {
    body.nameQuery = request.nameQuery;
  }
  if (request.addressQuery && request.addressQuery.trim() !== "") {
    body.addressQuery = request.addressQuery;
  }
  if (request.viewpointId) {
    body.viewpointId = request.viewpointId;
  }
  if (request.filters) {
    const pruned = pruneFilters(request.filters);
    if (pruned) {
      body.filters = pruned;
    }
  }
  return body;
}

/**
 * Run a name/address/filter search within a tree (Requirements 16.1–16.4).
 * Returns the matching persons and the no-match indication (16.6).
 */
export function searchTree(
  treeId: string,
  request: SearchRequest,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  return api.post<SearchResponse>(
    `/trees/${encodeURIComponent(treeId)}/search`,
    buildSearchBody(request),
    { signal },
  );
}
