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
  claimed?: boolean;
  deathDay?: number | null;
  deathMonth?: number | null;
  deathYear?: number | null;
  deathCalendar?: string | null;
  deathLunarLeap?: boolean | null;
  visDeath?: string | null;
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

  // Build spouses lookup and check if there are relationships
  const spousesOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();

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

  // Automatically group parents who share a child as a unit for layout
  parentsOf.forEach((parents) => {
    if (parents.length >= 2) {
      const p1 = parents[0];
      const p2 = parents[1];
      if (!spousesOf.has(p1)) spousesOf.set(p1, []);
      if (!spousesOf.get(p1)!.includes(p2)) {
        spousesOf.get(p1)!.push(p2);
      }
      if (!spousesOf.has(p2)) spousesOf.set(p2, []);
      if (!spousesOf.get(p2)!.includes(p1)) {
        spousesOf.get(p2)!.push(p1);
      }
    }
  });

  const hasRelationships = (id: string): boolean => {
    return relationships.some((r) => r.sourceId === id || r.targetId === id);
  };

  // Group persons into marriage units
  const personUnitId = new Map<string, string>();
  const units = new Map<string, string[]>();
  const visitedForUnit = new Set<string>();

  persons.forEach((p) => {
    if (visitedForUnit.has(p.id)) return;

    const unit: string[] = [];
    const stack = [p.id];
    visitedForUnit.add(p.id);

    while (stack.length > 0) {
      const curr = stack.pop()!;
      unit.push(curr);

      const spouses = spousesOf.get(curr) || [];
      spouses.forEach((spId) => {
        if (!visitedForUnit.has(spId)) {
          // Only group if the spouse is actually in the persons list
          if (persons.some((pe) => pe.id === spId)) {
            visitedForUnit.add(spId);
            stack.push(spId);
          }
        }
      });
    }

    const unitId = unit[0];
    units.set(unitId, unit);
    unit.forEach((pid) => {
      personUnitId.set(pid, unitId);
    });
  });

  // Build directed graph of units
  const unitChildren = new Map<string, Set<string>>();
  const unitParents = new Map<string, Set<string>>();

  units.forEach((_, uid) => {
    unitChildren.set(uid, new Set());
    unitParents.set(uid, new Set());
  });

  relationships.forEach((r) => {
    if (r.type === "bloodline_father" || r.type === "bloodline_mother") {
      const parentUnit = personUnitId.get(r.sourceId);
      const childUnit = personUnitId.get(r.targetId);
      if (parentUnit && childUnit && parentUnit !== childUnit) {
        unitChildren.get(parentUnit)!.add(childUnit);
        unitParents.get(childUnit)!.add(parentUnit);
      }
    }
  });

  const activeUnitIds = new Set<string>();
  persons.forEach((p) => {
    if (hasRelationships(p.id)) {
      const uid = personUnitId.get(p.id);
      if (uid) {
        activeUnitIds.add(uid);
      }
    }
  });

  const unitDepthMap = new Map<string, number>();
  activeUnitIds.forEach((uid) => unitDepthMap.set(uid, 0));

  // Relax constraints to align generations:
  // 1. If a parent has depth D, children must have depth >= D + 1
  // 2. All children (siblings) of the same parent unit must have the exact same depth
  for (let iter = 0; iter < 100; iter++) {
    let changed = false;

    units.forEach((_, parentId) => {
      if (!activeUnitIds.has(parentId)) return;
      const parentDepth = unitDepthMap.get(parentId) || 0;
      const children = unitChildren.get(parentId) || new Set();
      if (children.size === 0) return;

      // Find max depth among all children, and ensure it is at least parentDepth + 1
      let targetChildDepth = parentDepth + 1;
      children.forEach((chUnit) => {
        const chDepth = unitDepthMap.get(chUnit) || 0;
        if (chDepth > targetChildDepth) {
          targetChildDepth = chDepth;
        }
      });

      // Update all children to targetChildDepth
      children.forEach((chUnit) => {
        const chDepth = unitDepthMap.get(chUnit) || 0;
        if (chDepth < targetChildDepth) {
          unitDepthMap.set(chUnit, targetChildDepth);
          changed = true;
        }
      });

      // Push parent down if children are pushed down
      const newParentDepth = targetChildDepth - 1;
      if (parentDepth < newParentDepth) {
        unitDepthMap.set(parentId, newParentDepth);
        changed = true;
      }
    });

    if (!changed) break;
  }

  // Map person depths from their units
  const depthMap = new Map<string, number>();
  persons.forEach((p) => {
    const uid = personUnitId.get(p.id);
    if (uid && unitDepthMap.has(uid)) {
      depthMap.set(p.id, unitDepthMap.get(uid)!);
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
  const pageCenter = padding + maxWidth / 2;

  // BƯỚC 4 & 5 — Tính x, y position và gán (sắp xếp top-down để con căn giữa theo cha mẹ):
  const depths = Array.from(generationMap.keys()).sort((a, b) => a - b);

  // Helper: midpoint X of all parents (including their spouse) for a given unit.
  // Reads live from `positions`, so it gives correct values both during the
  // top-down pass and after the bottom-up centering pass.
  const getParentMidX = (uid: string): number => {
    const unitMembers = units.get(uid) || [];
    let parentXSum = 0;
    let parentXCount = 0;

    unitMembers.forEach((m) => {
      const parents = parentsOf.get(m) || [];
      parents.forEach((parentId) => {
        const pos = positions.get(parentId);
        const spouses = spousesOf.get(parentId) || [];
        const spouseId = spouses.find((sId) => positions.has(sId));
        const spousePos = spouseId ? positions.get(spouseId) : undefined;

        if (pos && spousePos) {
          parentXSum += (pos.x + spousePos.x) / 2;
          parentXCount++;
        } else if (pos) {
          parentXSum += pos.x;
          parentXCount++;
        }
      });
    });

    if (parentXCount > 0) return parentXSum / parentXCount;
    return pageCenter;
  };

  depths.forEach((depth) => {
    const genPersons = generationMap.get(depth) || [];

    // Group các person trong thế hệ này theo unit (cụm vợ chồng)
    const unitsInGen = new Set<string>();
    genPersons.forEach((p) => {
      const uid = personUnitId.get(p.id);
      if (uid) {
        unitsInGen.add(uid);
      }
    });

    // Sắp xếp các cụm (unit) theo tọa độ ngang trung bình của cha mẹ để gom cụm nhánh huyết thống
    const activeUnits = Array.from(unitsInGen).sort((a, b) => {
      const parentA = getParentMidX(a);
      const parentB = getParentMidX(b);
      if (Math.abs(parentA - parentB) > 0.1) {
        return parentA - parentB;
      }
      const idxA = persons.findIndex((p) => p.id === a);
      const idxB = persons.findIndex((p) => p.id === b);
      return idxA - idxB;
    });

    // Tính preferred X cho từng unit
    const x = activeUnits.map((uid) => {
      const unitMembers = units.get(uid) || [];
      const membersInGen = unitMembers.filter((m) => genPersons.some((gp) => gp.id === m));

      let midParentXSum = 0;
      let parentCount = 0;

      membersInGen.forEach((m) => {
        const parents = parentsOf.get(m) || [];
        let parentXSum = 0;
        let parentXCount = 0;
        parents.forEach((parentId) => {
          const pos = positions.get(parentId);
          if (pos) {
            parentXSum += pos.x;
            parentXCount++;
          }
        });

        if (parentXCount > 0) {
          const midParentX = parentXSum / parentXCount;
          let preferredX = midParentX;
          // Nếu có 2 người trong cụm (vợ chồng), căn chỉnh để người con đứng đúng vị trí giữa của cha mẹ
          if (membersInGen.length === 2) {
            const isFirst = membersInGen[0] === m;
            preferredX = midParentX + (isFirst ? 1 : -1) * cellWidth / 2;
          }
          midParentXSum += preferredX;
          parentCount++;
        }
      });

      if (parentCount > 0) {
        return midParentXSum / parentCount;
      }
      
      // Fallback: nếu không có cha mẹ, căn giữa trang hoặc đặt cạnh nhau
      // Để tránh tất cả các root không cha mẹ tụ vào chính giữa, ta dùng vị trí mặc định từ thứ tự
      const idx = activeUnits.indexOf(uid);
      return pageCenter + (idx - (activeUnits.length - 1) / 2) * cellWidth;
    });

    const widths = activeUnits.map((uid) => {
      const unitMembers = units.get(uid) || [];
      const membersInGen = unitMembers.filter((m) => genPersons.some((gp) => gp.id === m));
      return membersInGen.length * cellWidth;
    });

    // Đẩy xa các cụm để tránh đè lên nhau (push-apart)
    for (let iter = 0; iter < 50; iter++) {
      for (let i = 0; i < activeUnits.length - 1; i++) {
        const minDistance = (widths[i] + widths[i + 1]) / 2;
        const actualDistance = x[i + 1] - x[i];
        if (actualDistance < minDistance) {
          const overlap = minDistance - actualDistance;
          x[i] -= overlap / 2;
          x[i + 1] += overlap / 2;
        }
      }
    }

    // Gán vị trí x, y chính thức cho các person trong thế hệ này
    const y = padding + depth * cellHeight;
    activeUnits.forEach((uid, idx) => {
      const unitCenter = x[idx];
      const unitMembers = units.get(uid) || [];
      const membersInGen = unitMembers.filter((m) => genPersons.some((gp) => gp.id === m));

      if (membersInGen.length === 1) {
        positions.set(membersInGen[0], { id: membersInGen[0], x: unitCenter, y });
      } else if (membersInGen.length === 2) {
        positions.set(membersInGen[0], { id: membersInGen[0], x: unitCenter - cellWidth / 2, y });
        positions.set(membersInGen[1], { id: membersInGen[1], x: unitCenter + cellWidth / 2, y });
      }
    });
  });

  // BƯỚC 7 — Căn chỉnh cha mẹ nằm giữa các con (Bottom-up alignment)
  for (let d = depths.length - 2; d >= 0; d--) {
    const depth = depths[d];
    const genPersons = generationMap.get(depth) || [];
    
    const unitsInGen = new Set<string>();
    genPersons.forEach((p) => {
      const uid = personUnitId.get(p.id);
      if (uid) unitsInGen.add(uid);
    });
    
    const activeUnits = Array.from(unitsInGen);
    if (activeUnits.length === 0) continue;

    const x = activeUnits.map((uid) => {
      const members = units.get(uid) || [];
      const posList = members.map(m => positions.get(m)).filter(Boolean) as NodePosition[];
      if (posList.length === 0) return pageCenter;
      return posList.reduce((sum, p) => sum + p.x, 0) / posList.length;
    });

    const widths = activeUnits.map((uid) => {
      const members = units.get(uid) || [];
      return members.length * cellWidth;
    });

    activeUnits.forEach((uid, idx) => {
      const children = unitChildren.get(uid) || new Set();
      let childrenXSum = 0;
      let childrenXCount = 0;

      children.forEach((chUnit) => {
        const chMembers = units.get(chUnit) || [];
        chMembers.forEach((m) => {
          const pos = positions.get(m);
          if (pos) {
            childrenXSum += pos.x;
            childrenXCount++;
          }
        });
      });

      if (childrenXCount > 0) {
        x[idx] = childrenXSum / childrenXCount;
      }
    });

    // Run push-apart to resolve any overlap after bottom-up shifting
    for (let iter = 0; iter < 50; iter++) {
      for (let i = 0; i < activeUnits.length - 1; i++) {
        const minDistance = (widths[i] + widths[i + 1]) / 2;
        const actualDistance = x[i + 1] - x[i];
        if (actualDistance < minDistance) {
          const overlap = minDistance - actualDistance;
          x[i] -= overlap / 2;
          x[i + 1] += overlap / 2;
        }
      }
    }

    activeUnits.forEach((uid, idx) => {
      const unitCenter = x[idx];
      const members = units.get(uid) || [];
      const membersInGen = members.filter((m) => genPersons.some((gp) => gp.id === m));

      if (membersInGen.length === 1) {
        const pos = positions.get(membersInGen[0]);
        if (pos) pos.x = unitCenter;
      } else if (membersInGen.length === 2) {
        const pos0 = positions.get(membersInGen[0]);
        const pos1 = positions.get(membersInGen[1]);
        if (pos0) pos0.x = unitCenter - cellWidth / 2;
        if (pos1) pos1.x = unitCenter + cellWidth / 2;
      }
    });
  }

  // BƯỚC 8 — Re-anchor the deepest generation under bottom-up-adjusted parent positions.
  //
  // After the bottom-up centering pass, intermediate parents (e.g. ego) may have shifted
  // significantly. The deepest generation nodes were placed based on parents' OLD positions,
  // so they can end up far from their parents and produce long crossing connector lines.
  // This pass re-sorts and re-places the leaf generation using the final parent positions.
  if (depths.length >= 2) {
    const deepestDepth = depths[depths.length - 1];
    const deepGenPersons = generationMap.get(deepestDepth) || [];
    const deepUnitsSet = new Set<string>();
    deepGenPersons.forEach((p) => {
      const uid = personUnitId.get(p.id);
      if (uid) deepUnitsSet.add(uid);
    });

    const deepActiveUnits = Array.from(deepUnitsSet).sort((a, b) => {
      const pA = getParentMidX(a);
      const pB = getParentMidX(b);
      if (Math.abs(pA - pB) > 0.1) return pA - pB;
      return persons.findIndex((p) => p.id === a) - persons.findIndex((p) => p.id === b);
    });

    const deepX = deepActiveUnits.map((uid) => {
      const unitMembers = units.get(uid) || [];
      const membersInGen = unitMembers.filter((m) => deepGenPersons.some((gp) => gp.id === m));
      let midParentXSum = 0;
      let parentCount = 0;

      membersInGen.forEach((m) => {
        const parents = parentsOf.get(m) || [];
        let parentXSum = 0;
        let parentXCount = 0;
        parents.forEach((parentId) => {
          const pos = positions.get(parentId);
          if (pos) { parentXSum += pos.x; parentXCount++; }
        });
        if (parentXCount > 0) {
          let preferredX = parentXSum / parentXCount;
          if (membersInGen.length === 2) {
            preferredX += (membersInGen[0] === m ? 1 : -1) * cellWidth / 2;
          }
          midParentXSum += preferredX;
          parentCount++;
        }
      });

      if (parentCount > 0) return midParentXSum / parentCount;
      const idx = deepActiveUnits.indexOf(uid);
      return pageCenter + (idx - (deepActiveUnits.length - 1) / 2) * cellWidth;
    });

    const deepWidths = deepActiveUnits.map((uid) => {
      const members = units.get(uid) || [];
      const inGen = members.filter((m) => deepGenPersons.some((gp) => gp.id === m));
      return inGen.length * cellWidth;
    });

    for (let iter = 0; iter < 50; iter++) {
      for (let i = 0; i < deepActiveUnits.length - 1; i++) {
        const minDist = (deepWidths[i] + deepWidths[i + 1]) / 2;
        const actualDist = deepX[i + 1] - deepX[i];
        if (actualDist < minDist) {
          const overlap = minDist - actualDist;
          deepX[i] -= overlap / 2;
          deepX[i + 1] += overlap / 2;
        }
      }
    }

    const deepY = padding + deepestDepth * cellHeight;
    deepActiveUnits.forEach((uid, idx) => {
      const members = units.get(uid) || [];
      const inGen = members.filter((m) => deepGenPersons.some((gp) => gp.id === m));
      const center = deepX[idx];
      if (inGen.length === 1) {
        const pos = positions.get(inGen[0]);
        if (pos) { pos.x = center; pos.y = deepY; }
      } else if (inGen.length === 2) {
        const pos0 = positions.get(inGen[0]);
        const pos1 = positions.get(inGen[1]);
        if (pos0) { pos0.x = center - cellWidth / 2; pos0.y = deepY; }
        if (pos1) { pos1.x = center + cellWidth / 2; pos1.y = deepY; }
      }
    });
  }

  return positions;
}
