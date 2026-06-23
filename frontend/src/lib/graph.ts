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
  phone?: string | null;
  email?: string | null;
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

/** Capitalize the first letter of a string. */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
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
  relationships: Relationship[] = [],
  opts: { cellWidth?: number; cellHeight?: number; padding?: number } = {}
): Map<string, NodePosition> {
  const cellWidth = opts.cellWidth ?? 160;
  const cellHeight = opts.cellHeight ?? 120;
  const padding = opts.padding ?? 40;

  const positions = new Map<string, NodePosition>();
  if (persons.length === 0) {
    return positions;
  }

  // BƯỚC 1 — Xác định root nodes:
  // Roots là các person có id không xuất hiện là target của bất kỳ bloodline relationship nào và có ít nhất một mối quan hệ.
  const childIds = new Set(
    relationships
      .filter((r) => r.type === "bloodline_father" || r.type === "bloodline_mother")
      .map((r) => r.targetId)
  );
  
  const hasRelationships = (id: string): boolean => {
    return relationships.some((r) => r.sourceId === id || r.targetId === id);
  };

  let roots = persons.filter((p) => !childIds.has(p.id) && hasRelationships(p.id));

  // Build adjacency maps for BFS
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const spousesOf = new Map<string, string[]>();

  relationships.forEach((r) => {
    if (r.type === "bloodline_father" || r.type === "bloodline_mother") {
      if (!childrenOf.has(r.sourceId)) childrenOf.set(r.sourceId, []);
      childrenOf.get(r.sourceId)!.push(r.targetId);

      if (!parentsOf.has(r.targetId)) parentsOf.set(r.targetId, []);
      parentsOf.get(r.targetId)!.push(r.sourceId);
    } else if (r.type === "marriage") {
      if (!spousesOf.has(r.sourceId)) spousesOf.set(r.sourceId, []);
      spousesOf.get(r.sourceId)!.push(r.targetId);

      if (!spousesOf.has(r.targetId)) spousesOf.set(r.targetId, []);
      spousesOf.get(r.targetId)!.push(r.sourceId);
    }
  });

  // If no roots exist but we have persons, pick the first person as root to start BFS
  if (roots.length === 0 && persons.length > 0) {
    roots = [persons[0]];
  }

  // BƯỚC 2 — BFS để gán generation depth:
  const depthMap = new Map<string, number>();
  const queue: string[] = [];

  roots.forEach((r) => {
    depthMap.set(r.id, 0);
    queue.push(r.id);
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currDepth = depthMap.get(current)!;

    // Spouse of node depth N: depth = N
    const spouses = spousesOf.get(current) || [];
    spouses.forEach((sp) => {
      const oldDepth = depthMap.get(sp);
      if (oldDepth === undefined || currDepth < oldDepth) {
        depthMap.set(sp, currDepth);
        queue.push(sp);
      }
    });

    // Con của node depth N: depth = N + 1
    const children = childrenOf.get(current) || [];
    children.forEach((ch) => {
      const oldDepth = depthMap.get(ch);
      if (oldDepth === undefined || currDepth + 1 < oldDepth) {
        depthMap.set(ch, currDepth + 1);
        queue.push(ch);
      }
    });
  }

  // Xử lý các node không bị cô lập nhưng chưa được BFS duyệt qua (ví dụ: các component nhỏ không kết nối với root chính)
  persons.forEach((p) => {
    if (!depthMap.has(p.id) && hasRelationships(p.id)) {
      depthMap.set(p.id, 0);
      queue.push(p.id);
      while (queue.length > 0) {
        const current = queue.shift()!;
        const currDepth = depthMap.get(current)!;

        const spouses = spousesOf.get(current) || [];
        spouses.forEach((sp) => {
          const oldDepth = depthMap.get(sp);
          if (oldDepth === undefined || currDepth < oldDepth) {
            depthMap.set(sp, currDepth);
            queue.push(sp);
          }
        });

        const children = childrenOf.get(current) || [];
        children.forEach((ch) => {
          const oldDepth = depthMap.get(ch);
          if (oldDepth === undefined || currDepth + 1 < oldDepth) {
            depthMap.set(ch, currDepth + 1);
            queue.push(ch);
          }
        });
      }
    }
  });

  // BƯỚC 6 — Fallback cho isolated nodes (không có relationship nào):
  // Xếp phía dưới tất cả generations, thành hàng riêng.
  let maxDepth = -1;
  depthMap.forEach((d) => {
    if (d > maxDepth) maxDepth = d;
  });
  const isolatedDepth = maxDepth + 1;

  const isolated = persons.filter((p) => !depthMap.has(p.id));
  isolated.forEach((p) => {
    depthMap.set(p.id, isolatedDepth);
  });

  // BƯỚC 3 — Group persons theo depth:
  const generationMap = new Map<number, Person[]>();
  persons.forEach((p) => {
    if (depthMap.has(p.id)) {
      const d = depthMap.get(p.id)!;
      if (!generationMap.has(d)) {
        generationMap.set(d, []);
      }
      generationMap.get(d)!.push(p);
    }
  });

  // Tìm maxWidth của tất cả generations để căn giữa
  let maxGenCount = 0;
  generationMap.forEach((pList) => {
    if (pList.length > maxGenCount) {
      maxGenCount = pList.length;
    }
  });
  const maxWidth = maxGenCount * cellWidth;

  // BƯỚC 4 & 5 — Tính x, y position và gán:
  generationMap.forEach((genPersons, depth) => {
    // Sắp xếp spouse đứng cạnh nhau trong cùng thế hệ
    const orderedPersonsInGen: Person[] = [];
    const visitedInGen = new Set<string>();

    genPersons.forEach((p) => {
      if (visitedInGen.has(p.id)) return;

      orderedPersonsInGen.push(p);
      visitedInGen.add(p.id);

      const spouses = spousesOf.get(p.id) || [];
      spouses.forEach((spId) => {
        if (visitedInGen.has(spId)) return;
        const spousePerson = genPersons.find((gp) => gp.id === spId);
        if (spousePerson) {
          orderedPersonsInGen.push(spousePerson);
          visitedInGen.add(spId);
        }
      });
    });

    // Tính vị trí x, y
    const count = orderedPersonsInGen.length;
    const startX = padding + (maxWidth - count * cellWidth) / 2;
    const y = padding + depth * cellHeight;

    orderedPersonsInGen.forEach((p, idx) => {
      const x = startX + idx * cellWidth + cellWidth / 2;
      positions.set(p.id, { id: p.id, x, y });
    });
  });

  return positions;
}
