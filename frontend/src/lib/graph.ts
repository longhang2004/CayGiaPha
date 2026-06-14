/**
 * Domain types and helpers for the tree/graph renderer (task 10.2).
 *
 * This module is deliberately framework-agnostic so it can be unit/property
 * tested without rendering React. It covers:
 *   - the Person / Relationship shapes the renderer consumes,
 *   - the edge-style classification that drives the THREE visually distinct
 *     line styles (solid / dashed / non-bloodline — Requirements 5.3, 6.3,
 *     12.4, 15.6),
 *   - the change-viewpoint all-addresses fetch (Requirements 10.1, 10.2),
 *   - a tiny deterministic layout used by the SVG renderer.
 */

import { api } from "./apiClient";

/** Relationship discriminator stored on every edge (design Data Models). */
export type RelationshipType =
  | "bloodline_father"
  | "bloodline_mother"
  | "marriage"
  | "non_bloodline"
  | "asserted";

/** Lifecycle/derivation state of a relationship (design 7.x). */
export type DerivationState = "derived" | "asserted" | "verified" | "conflict";

/** Social subtype for non-bloodline edges (Requirement 12.1). */
export type SocialType = "friend" | "teacher" | "colleague";

export interface Person {
  id: string;
  displayName: string;
  gender?: "male" | "female";
  birthOrder?: number | null;
  birthYear?: number | null;
  deceased?: boolean;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  derivationState: DerivationState;
  /** Present for asserted edges; the user-provided kinship label. */
  assertedLabel?: string | null;
  /** Present for non-bloodline edges. */
  socialType?: SocialType | null;
}

/**
 * The three mutually-exclusive visual edge styles.
 *  - `solid`         → derived/verified bloodline & marriage edges (5.3, 7.2)
 *  - `dashed`        → asserted/conflict edges (6.3, 15.6)
 *  - `non-bloodline` → social edges, a third distinct style (12.4)
 */
export type EdgeStyle = "solid" | "dashed" | "non-bloodline";

/**
 * Classify a relationship into one of the three edge styles.
 *
 * Order matters: a `non_bloodline` edge keeps the default `derived` state, so
 * we must branch on its type before considering the derivation state.
 */
export function edgeStyleFor(rel: Pick<Relationship, "type" | "derivationState">): EdgeStyle {
  if (rel.type === "non_bloodline") {
    return "non-bloodline";
  }
  if (rel.type === "asserted" || rel.derivationState === "asserted" || rel.derivationState === "conflict") {
    return "dashed";
  }
  // bloodline_* and marriage with derived/verified state.
  return "solid";
}

/** SVG `stroke-dasharray` for each style; each value is visually distinct. */
export const STROKE_DASHARRAY: Record<EdgeStyle, string> = {
  solid: "0",
  dashed: "6 4",
  "non-bloodline": "1 5",
};

/** Stable CSS class per style, used by tests to assert distinguishability. */
export const EDGE_CLASS: Record<EdgeStyle, string> = {
  solid: "edge-solid",
  dashed: "edge-dashed",
  "non-bloodline": "edge-non-bloodline",
};

/** Canonical relation descriptor carried by an address (subset we render). */
export interface CanonicalRelation {
  canonicalKey?: string;
  upCount?: number;
  downCount?: number;
  side?: "paternal" | "maternal" | "none";
  targetGender?: "male" | "female";
  branchOrder?: "elder" | "younger" | "unknown";
  spouseHop?: boolean;
}

export interface Address {
  personId: string;
  /** The resolved Form_Of_Address term, or null when unresolved. */
  resolved: string | null;
  status: "resolved" | "unresolved" | string;
  /** Set to "unresolved" by the backend for targets with no defined term. */
  unresolvedIndicator?: string | null;
  relation?: CanonicalRelation | null;
}

export interface ViewpointAddresses {
  egoId: string;
  addresses: Address[];
}

/** Human-facing marker for an address that could not be resolved (8.7/10.3). */
export const UNRESOLVED_LABEL = "(chưa xác định)";

/** True when the address carries the unresolved indicator. */
export function isUnresolved(address: Address | undefined): boolean {
  if (!address) {
    return true;
  }
  return (
    address.unresolvedIndicator === "unresolved" ||
    address.status === "unresolved" ||
    address.resolved == null
  );
}

/** The label to display for an address (term or the unresolved marker). */
export function addressLabel(address: Address | undefined): string {
  if (isUnresolved(address)) {
    return UNRESOLVED_LABEL;
  }
  return address!.resolved as string;
}

/** Build a lookup of personId → Address from a viewpoint result. */
export function indexAddresses(result: ViewpointAddresses): Map<string, Address> {
  const map = new Map<string, Address>();
  for (const a of result.addresses) {
    map.set(a.personId, a);
  }
  return map;
}

/**
 * Fetch the all-addresses change-viewpoint result for a new ego node
 * (Requirements 10.1, 10.2). The backend computes every node's address from
 * the ego in a single pass.
 */
export async function fetchViewpointAddresses(
  treeId: string,
  egoId: string,
  signal?: AbortSignal,
): Promise<ViewpointAddresses> {
  return api.get<ViewpointAddresses>(
    `/trees/${encodeURIComponent(treeId)}/viewpoint/${encodeURIComponent(egoId)}/addresses`,
    { signal },
  );
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

/**
 * Deterministic grid layout. A full graph-layout library is optional for this
 * task — correctness of edge styling, selection info, and the viewpoint
 * re-render is what matters — so we lay nodes out in a stable grid.
 */
export function layoutNodes(
  persons: Person[],
  opts: { columns?: number; cellWidth?: number; cellHeight?: number; padding?: number } = {},
): Map<string, NodePosition> {
  const columns = opts.columns ?? Math.max(1, Math.ceil(Math.sqrt(persons.length || 1)));
  const cellWidth = opts.cellWidth ?? 160;
  const cellHeight = opts.cellHeight ?? 120;
  const padding = opts.padding ?? 40;

  const positions = new Map<string, NodePosition>();
  persons.forEach((p, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    positions.set(p.id, {
      id: p.id,
      x: padding + col * cellWidth,
      y: padding + row * cellHeight,
    });
  });
  return positions;
}
