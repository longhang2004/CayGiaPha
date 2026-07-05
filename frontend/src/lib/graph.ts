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
  /** Present for marriage edges. */
  maritalStatus?: "married" | "divorced" | "deceased" | string | null;
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

export interface CollapsedExtendedBranches {
  persons: Person[];
  relationships: Relationship[];
  /** Boundary spouse / in-law nodes that have hidden relatives outside the current ego's bloodline. */
  collapsedBranchRoots: Set<string>;
}

function isBloodlineRelationship(rel: Pick<Relationship, "type">): boolean {
  return rel.type === "bloodline_father" || rel.type === "bloodline_mother";
}

/**
 * Keep the graph centered on the current ego's bloodline.
 *
 * The ego's own bloodline component is rendered in full. Spouses/in-laws are
 * shown one hop away so the family structure remains understandable, but each
 * spouse's separate family tree is collapsed until that spouse becomes the
 * active viewpoint.
 */
export function collapseExtendedFamilyBranches(
  persons: Person[],
  relationships: Relationship[],
  egoId?: string,
): CollapsedExtendedBranches {
  if (!egoId || !persons.some((p) => p.id === egoId)) {
    return { persons, relationships, collapsedBranchRoots: new Set() };
  }

  const personIds = new Set(persons.map((p) => p.id));
  const fullAdjacency = new Map<string, Set<string>>();
  const parentsOf = new Map<string, Set<string>>();
  const childrenOf = new Map<string, Set<string>>();

  const addEdge = (map: Map<string, Set<string>>, sourceId: string, targetId: string) => {
    if (!personIds.has(sourceId) || !personIds.has(targetId)) return;
    if (!map.has(sourceId)) map.set(sourceId, new Set());
    if (!map.has(targetId)) map.set(targetId, new Set());
    map.get(sourceId)!.add(targetId);
    map.get(targetId)!.add(sourceId);
  };

  relationships.forEach((rel) => {
    addEdge(fullAdjacency, rel.sourceId, rel.targetId);
    if (isBloodlineRelationship(rel)) {
      if (!parentsOf.has(rel.targetId)) parentsOf.set(rel.targetId, new Set());
      if (!childrenOf.has(rel.sourceId)) childrenOf.set(rel.sourceId, new Set());
      parentsOf.get(rel.targetId)!.add(rel.sourceId);
      childrenOf.get(rel.sourceId)!.add(rel.targetId);
    }
  });

  const ancestorIds = new Set<string>([egoId]);
  const ancestorQueue = [egoId];
  while (ancestorQueue.length > 0) {
    const currentId = ancestorQueue.shift()!;
    const parents = parentsOf.get(currentId) || new Set<string>();
    parents.forEach((parentId) => {
      if (!ancestorIds.has(parentId)) {
        ancestorIds.add(parentId);
        ancestorQueue.push(parentId);
      }
    });
  }

  const bloodlineIds = new Set<string>(ancestorIds);
  const descendantQueue = [...ancestorIds];
  while (descendantQueue.length > 0) {
    const currentId = descendantQueue.shift()!;
    const children = childrenOf.get(currentId) || new Set<string>();
    children.forEach((childId) => {
      if (!bloodlineIds.has(childId)) {
        bloodlineIds.add(childId);
        descendantQueue.push(childId);
      }
    });
  }

  const visibleIds = new Set<string>(bloodlineIds);
  const boundaryIds = new Set<string>();

  relationships.forEach((rel) => {
    if (rel.type !== "marriage") return;

    const sourceInBloodline = bloodlineIds.has(rel.sourceId);
    const targetInBloodline = bloodlineIds.has(rel.targetId);
    if (sourceInBloodline && !targetInBloodline && personIds.has(rel.targetId)) {
      visibleIds.add(rel.targetId);
      boundaryIds.add(rel.targetId);
    } else if (targetInBloodline && !sourceInBloodline && personIds.has(rel.sourceId)) {
      visibleIds.add(rel.sourceId);
      boundaryIds.add(rel.sourceId);
    }
  });

  relationships.forEach((rel) => {
    if (rel.type !== "asserted" && rel.type !== "non_bloodline") return;

    const sourceInBloodline = bloodlineIds.has(rel.sourceId);
    const targetInBloodline = bloodlineIds.has(rel.targetId);
    if (sourceInBloodline && personIds.has(rel.targetId)) {
      visibleIds.add(rel.targetId);
    } else if (targetInBloodline && personIds.has(rel.sourceId)) {
      visibleIds.add(rel.sourceId);
    }
  });

  const collapsedBranchRoots = new Set<string>();
  boundaryIds.forEach((boundaryId) => {
    const hiddenReachable = new Set<string>();
    const boundaryQueue = [boundaryId];

    while (boundaryQueue.length > 0) {
      const currentId = boundaryQueue.shift()!;
      const neighbors = fullAdjacency.get(currentId) || new Set<string>();

      neighbors.forEach((neighborId) => {
        if (visibleIds.has(neighborId) || neighborId === boundaryId || hiddenReachable.has(neighborId)) {
          return;
        }
        hiddenReachable.add(neighborId);
        boundaryQueue.push(neighborId);
      });
    }

    if (hiddenReachable.size > 0) {
      collapsedBranchRoots.add(boundaryId);
    }
  });

  const filteredPersons = persons.filter((p) => visibleIds.has(p.id));
  const filteredRelationships = relationships.filter(
    (rel) => visibleIds.has(rel.sourceId) && visibleIds.has(rel.targetId),
  );

  return { persons: filteredPersons, relationships: filteredRelationships, collapsedBranchRoots };
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

  // Local helper functions to run bottom-up and top-down passes iteratively
  const runBottomUp = () => {
    for (let d = depths.length - 2; d >= 0; d--) {
      const depth = depths[d];
      const genPersons = generationMap.get(depth) || [];
      
      const unitsInGen = new Set<string>();
      genPersons.forEach((p) => {
        const uid = personUnitId.get(p.id);
        if (uid) unitsInGen.add(uid);
      });
      
      const getUnitX = (uid: string): number => {
        const members = units.get(uid) || [];
        const posList = members.map(m => positions.get(m)).filter(Boolean) as NodePosition[];
        if (posList.length === 0) return pageCenter;
        return posList.reduce((sum, p) => sum + p.x, 0) / posList.length;
      };
      const activeUnits = Array.from(unitsInGen).sort((a, b) => getUnitX(a) - getUnitX(b));
      if (activeUnits.length === 0) continue;

      const x = activeUnits.map((uid) => getUnitX(uid));
      const widths = activeUnits.map((uid) => {
        const members = units.get(uid) || [];
        return members.length * cellWidth;
      });

      activeUnits.forEach((uid, idx) => {
        const children = unitChildren.get(uid) || new Set();
        const parentMembers = units.get(uid) || [];
        let childrenXSum = 0;
        let childrenXCount = 0;

        children.forEach((chUnit) => {
          const chMembers = units.get(chUnit) || [];
          chMembers.forEach((m) => {
            const mParents = parentsOf.get(m) || [];
            const isActualChild = mParents.some(pId => parentMembers.includes(pId));
            if (!isActualChild) return;

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

      const paired = activeUnits.map((uid, idx) => ({
        uid,
        width: widths[idx],
        xVal: x[idx]
      }));
      paired.sort((a, b) => a.xVal - b.xVal);

      const sortedActiveUnits = paired.map(p => p.uid);
      const sortedWidths = paired.map(p => p.width);
      const sortedX = paired.map(p => p.xVal);

      for (let iter = 0; iter < 50; iter++) {
        for (let i = 0; i < sortedActiveUnits.length - 1; i++) {
          const minDistance = (sortedWidths[i] + sortedWidths[i + 1]) / 2;
          const actualDistance = sortedX[i + 1] - sortedX[i];
          if (actualDistance < minDistance) {
            const overlap = minDistance - actualDistance;
            sortedX[i] -= overlap / 2;
            sortedX[i + 1] += overlap / 2;
          }
        }
      }

      sortedActiveUnits.forEach((uid, idx) => {
        const unitCenter = sortedX[idx];
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
  };

  const runTopDown = () => {
    for (let d = 1; d < depths.length; d++) {
      const depth = depths[d];
      const genPersons = generationMap.get(depth) || [];
      const unitsInGen = new Set<string>();
      genPersons.forEach((p) => {
        const uid = personUnitId.get(p.id);
        if (uid) unitsInGen.add(uid);
      });

      const activeUnits = Array.from(unitsInGen).sort((a, b) => {
        const pA = getParentMidX(a);
        const pB = getParentMidX(b);
        if (Math.abs(pA - pB) > 0.1) return pA - pB;
        const idxA = persons.findIndex((p) => p.id === a);
        const idxB = persons.findIndex((p) => p.id === b);
        return idxA - idxB;
      });

      const x = activeUnits.map((uid) => {
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

        if (parentXCount > 0) {
          return parentXSum / parentXCount;
        }

        const genMembers = unitMembers.filter((m) => genPersons.some((gp) => gp.id === m));
        const currentX = genMembers.reduce((sum, m) => sum + (positions.get(m)?.x || 0), 0) / (genMembers.length || 1);
        return currentX;
      });

      const widths = activeUnits.map((uid) => {
        const members = units.get(uid) || [];
        const genMembers = members.filter((m) => genPersons.some((gp) => gp.id === m));
        return genMembers.length * cellWidth;
      });

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

      const genY = padding + depth * cellHeight;
      activeUnits.forEach((uid, idx) => {
        const unitCenter = x[idx];
        const members = units.get(uid) || [];
        const genMembers = members.filter((m) => genPersons.some((gp) => gp.id === m));

        if (genMembers.length === 1) {
          const pos = positions.get(genMembers[0]);
          if (pos) { pos.x = unitCenter; pos.y = genY; }
        } else if (genMembers.length === 2) {
          const pos0 = positions.get(genMembers[0]);
          const pos1 = positions.get(genMembers[1]);
          if (pos0) { pos0.x = unitCenter - cellWidth / 2; pos0.y = genY; }
          if (pos1) { pos1.x = unitCenter + cellWidth / 2; pos1.y = genY; }
        }
      });
    }
  };

  // Perform multiple-pass convergence (Bottom-Up, then Top-Down, then a final Bottom-Up)
  // to ensure that both parents and children are perfectly centered relative to each other,
  // even after horizontal shifts from the push-apart overlap resolver.
  runBottomUp();
  runTopDown();
  runBottomUp();

  return positions;
}

export function layoutMultiTreeNodes(
  persons: Person[],
  relationships: Relationship[] = [],
  opts: { cellWidth?: number; cellHeight?: number; padding?: number } = {}
): Map<string, NodePosition> {
  if (persons.length === 0) {
    return new Map();
  }

  // 1. Build adjacency list of connected persons (ignoring cross-tree/unidentified relations)
  const adj = new Map<string, string[]>();
  const addEdge = (u: string, v: string) => {
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u)!.push(v);
    adj.get(v)!.push(u);
  };

  relationships.forEach((r) => {
    // Ignore cross-tree / unidentified relationships
    if (
      (r.derivationState as string) === "unidentified" ||
      (r.type === "asserted" && (r.assertedLabel || "").toLowerCase().includes("chưa xác định"))
    ) {
      return;
    }
    addEdge(r.sourceId, r.targetId);
  });

  // 2. Find connected components (DFS/BFS)
  const visited = new Set<string>();
  const components: string[][] = [];

  persons.forEach((p) => {
    if (visited.has(p.id)) return;
    const comp: string[] = [];
    const queue = [p.id];
    visited.add(p.id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      comp.push(curr);
      const neighbors = adj.get(curr) || [];
      neighbors.forEach((n) => {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      });
    }
    components.push(comp);
  });

  // 3. Layout each component and offset them horizontally
  const finalPositions = new Map<string, NodePosition>();
  const cellWidth = opts.cellWidth ?? 160;
  const padding = opts.padding ?? 40;
  const horizontalSpacing = 300; // Spacing between different trees

  let offsetX = padding;

  components.forEach((compIds) => {
    const compPersons = persons.filter((p) => compIds.includes(p.id));
    const compRelationships = relationships.filter((r) =>
      compIds.includes(r.sourceId) && compIds.includes(r.targetId)
    );

    const compPositions = layoutNodes(compPersons, compRelationships, opts);
    if (compPositions.size === 0) return;

    // Find bounding box of this component
    let minX = Infinity;
    let maxX = -Infinity;
    compPositions.forEach((pos) => {
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
    });

    const compWidth = (maxX - minX) + cellWidth;

    // Shift coordinates and add to final positions
    compPositions.forEach((pos, id) => {
      finalPositions.set(id, {
        id,
        x: pos.x - minX + offsetX,
        y: pos.y,
      });
    });

    offsetX += compWidth + horizontalSpacing;
  });

  return finalPositions;
}
