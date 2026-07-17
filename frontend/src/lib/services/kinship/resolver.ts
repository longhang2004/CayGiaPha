import { KinshipGraphProjection, Step, StepKind, Side, ParentType } from "./projection";

export type Gender = "MALE" | "FEMALE";
export type BranchOrder = "ELDER" | "YOUNGER" | "SELF" | "UNKNOWN";
export type KinshipOrdinalBand = "sibling" | "parent_sibling";

export interface KinshipOrdinalContext {
  sourcePersonId: string;
  birthOrder: number;
  band: KinshipOrdinalBand;
  inheritedThroughSpouse: boolean;
}

export class CanonicalRelation {
  constructor(
    public readonly upCount: number,
    public readonly downCount: number,
    public readonly side: Side,
    public readonly targetGender: Gender,
    public readonly branchOrder: BranchOrder,
    public readonly spouseHop: boolean
  ) {}

  hasSiblingBranch(): boolean {
    return this.upCount >= 1 && this.downCount >= 1;
  }

  canonicalKey(): string {
    return `u${this.upCount}:d${this.downCount}:${this.side}:${this.targetGender}:${this.branchOrder}:s${
      this.spouseHop ? 1 : 0
    }`;
  }
}

export type ResolutionStatus =
  | "RESOLVED"
  | "UNRESOLVED_NO_PATH"
  | "UNRESOLVED_INDETERMINATE_ORDER";

export class CanonicalResolution {
  constructor(
    public readonly status: ResolutionStatus,
    public readonly relation: CanonicalRelation | null,
    public readonly ordinalContext: KinshipOrdinalContext | null = null
  ) {
    if (status === "RESOLVED" && !relation) {
      throw new Error("RESOLVED resolution requires a relation");
    }
    if (status !== "RESOLVED" && relation) {
      throw new Error("unresolved resolution must not carry a relation");
    }
  }

  static resolved(
    relation: CanonicalRelation,
    ordinalContext: KinshipOrdinalContext | null = null
  ): CanonicalResolution {
    return new CanonicalResolution("RESOLVED", relation, ordinalContext);
  }

  static noPath(): CanonicalResolution {
    return new CanonicalResolution("UNRESOLVED_NO_PATH", null);
  }

  static indeterminateOrder(): CanonicalResolution {
    return new CanonicalResolution("UNRESOLVED_INDETERMINATE_ORDER", null);
  }

  isResolved(): boolean {
    return this.status === "RESOLVED";
  }

  isUnresolved(): boolean {
    return this.status !== "RESOLVED";
  }
}

export interface PersonLookupSource {
  id: string;
  gender?: string | null;
  birthOrder?: number | null;
  birthYear?: number | null;
  displayName: string;
}

export class KinshipResolver {
  resolveCanonical(
    projection: KinshipGraphProjection | null,
    egoId: string | null,
    targetId: string | null,
    personLookup: (id: string) => PersonLookupSource | undefined
  ): CanonicalResolution {
    if (!projection || !egoId || !targetId || !personLookup) {
      return CanonicalResolution.noPath();
    }

    const targetPerson = personLookup(targetId);
    const targetGender = this.genderOf(targetPerson);

    // Ego addressing itself: the trivial SELF relation. (No path needed.)
    if (egoId === targetId) {
      if (!targetGender) {
        return CanonicalResolution.noPath();
      }
      return CanonicalResolution.resolved(
        new CanonicalRelation(0, 0, "SELF", targetGender, "SELF", false)
      );
    }

    if (!projection.contains(egoId) || !projection.contains(targetId)) {
      return CanonicalResolution.noPath();
    }
    if (!targetGender) {
      return CanonicalResolution.noPath();
    }

    const path = this.shortestPath(projection, egoId, targetId);
    if (!path) {
      return CanonicalResolution.noPath();
    }

    return this.derive(path, egoId, targetGender, personLookup);
  }

  resolveAllFrom(
    projection: KinshipGraphProjection | null,
    egoId: string | null,
    targetIds: string[] | null,
    personLookup: (id: string) => PersonLookupSource | undefined
  ): Map<string, CanonicalResolution> {
    const result = new Map<string, CanonicalResolution>();
    if (!targetIds) {
      return result;
    }
    if (!projection || !egoId || !personLookup) {
      for (const targetId of targetIds) {
        result.set(targetId, CanonicalResolution.noPath());
      }
      return result;
    }

    const tree = this.bfs(projection, egoId);

    for (const targetId of targetIds) {
      result.set(
        targetId,
        this.resolveFromTree(projection, tree, egoId, targetId, personLookup)
      );
    }
    return result;
  }

  private resolveFromTree(
    projection: KinshipGraphProjection,
    tree: { predecessor: Map<string, string | null>; incomingStep: Map<string, Step> },
    egoId: string,
    targetId: string,
    personLookup: (id: string) => PersonLookupSource | undefined
  ): CanonicalResolution {
    if (!targetId) {
      return CanonicalResolution.noPath();
    }
    const targetPerson = personLookup(targetId);
    const targetGender = this.genderOf(targetPerson);

    if (egoId === targetId) {
      if (!targetGender) {
        return CanonicalResolution.noPath();
      }
      return CanonicalResolution.resolved(
        new CanonicalRelation(0, 0, "SELF", targetGender, "SELF", false)
      );
    }

    if (!projection.contains(egoId) || !projection.contains(targetId)) {
      return CanonicalResolution.noPath();
    }
    if (!targetGender) {
      return CanonicalResolution.noPath();
    }
    if (!tree.predecessor.has(targetId)) {
      return CanonicalResolution.noPath();
    }

    const path = this.reconstruct(tree.incomingStep, tree.predecessor, egoId, targetId);
    return this.derive(path, egoId, targetGender, personLookup);
  }

  private shortestPath(
    projection: KinshipGraphProjection,
    ego: string,
    target: string
  ): Step[] | null {
    const incomingStep = new Map<string, Step>();
    const predecessor = new Map<string, string | null>();
    const queue: string[] = [];
    predecessor.set(ego, null);
    queue.push(ego);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === target) {
        return this.reconstruct(incomingStep, predecessor, ego, target);
      }
      for (const step of projection.stepsFrom(current)) {
        const next = step.to;
        if (!predecessor.has(next)) {
          predecessor.set(next, current);
          incomingStep.set(next, step);
          queue.push(next);
        }
      }
    }
    return null;
  }

  private bfs(
    projection: KinshipGraphProjection,
    ego: string
  ): { predecessor: Map<string, string | null>; incomingStep: Map<string, Step> } {
    const incomingStep = new Map<string, Step>();
    const predecessor = new Map<string, string | null>();
    const queue: string[] = [];
    predecessor.set(ego, null);
    queue.push(ego);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const step of projection.stepsFrom(current)) {
        const next = step.to;
        if (!predecessor.has(next)) {
          predecessor.set(next, current);
          incomingStep.set(next, step);
          queue.push(next);
        }
      }
    }
    return { predecessor, incomingStep };
  }

  private reconstruct(
    incomingStep: Map<string, Step>,
    predecessor: Map<string, string | null>,
    ego: string,
    target: string
  ): Step[] {
    const reversed: Step[] = [];
    let node = target;
    while (node !== ego) {
      reversed.push(incomingStep.get(node)!);
      node = predecessor.get(node)!;
    }
    return reversed.reverse();
  }

  private derive(
    path: Step[],
    egoId: string,
    targetGender: Gender,
    personLookup: (id: string) => PersonLookupSource | undefined
  ): CanonicalResolution {
    const nodes: string[] = [egoId];
    for (const step of path) {
      nodes.push(step.to);
    }

    const kinds = path.map((s) => s.kind);

    let spouseHop = false;
    let bloodEnd = nodes.length - 1;
    if (kinds.length > 0 && kinds[kinds.length - 1] === "SPOUSE") {
      spouseHop = true;
      bloodEnd = nodes.length - 2;
    }

    let upCount = 0;
    while (upCount < bloodEnd && kinds[upCount] === "UP") {
      upCount++;
    }

    let downCount = 0;
    let idx = upCount;
    while (idx < bloodEnd && kinds[idx] === "DOWN") {
      downCount++;
      idx++;
    }

    if (idx !== bloodEnd) {
      return CanonicalResolution.noPath();
    }

    const side = this.sideOf(upCount, path);

    let branchOrder: BranchOrder;
    if (upCount >= 1 && downCount >= 1) {
      const egoConnectingParent = nodes[upCount - 1];
      const relativeConnectingAncestor = nodes[upCount + 1];
      branchOrder = this.compareBranch(
        personLookup(relativeConnectingAncestor),
        personLookup(egoConnectingParent)
      );
      if (branchOrder === "UNKNOWN") {
        return CanonicalResolution.indeterminateOrder();
      }
    } else {
      branchOrder = "SELF";
    }

    const ordinalContext = this.ordinalContext(
      nodes,
      bloodEnd,
      upCount,
      downCount,
      spouseHop,
      personLookup
    );

    return CanonicalResolution.resolved(
      new CanonicalRelation(upCount, downCount, side, targetGender, branchOrder, spouseHop),
      ordinalContext
    );
  }

  private ordinalContext(
    nodes: string[],
    bloodEnd: number,
    upCount: number,
    downCount: number,
    spouseHop: boolean,
    personLookup: (id: string) => PersonLookupSource | undefined
  ): KinshipOrdinalContext | null {
    let band: KinshipOrdinalBand | null = null;
    if (upCount === 1 && downCount === 1) {
      band = "sibling";
    } else if (upCount === 2 && downCount === 1) {
      band = "parent_sibling";
    }
    if (!band) {
      return null;
    }

    const sourcePersonId = nodes[bloodEnd];
    const birthOrder = personLookup(sourcePersonId)?.birthOrder;
    if (!Number.isInteger(birthOrder) || birthOrder! < 1 || birthOrder! > 99) {
      return null;
    }

    return {
      sourcePersonId,
      birthOrder: birthOrder!,
      band,
      inheritedThroughSpouse: spouseHop,
    };
  }

  private sideOf(upCount: number, steps: Step[]): Side {
    if (upCount === 0) {
      return "SELF";
    }
    const firstUp = steps[0];
    const lineageSide = firstUp.side();
    if (lineageSide === "PATERNAL") {
      return "PATERNAL";
    }
    if (lineageSide === "MATERNAL") {
      return "MATERNAL";
    }
    return "SELF";
  }

  private compareBranch(
    relativeAncestor: PersonLookupSource | undefined,
    egoParent: PersonLookupSource | undefined
  ): BranchOrder {
    if (!relativeAncestor || !egoParent) {
      return "UNKNOWN";
    }

    const relOrder = relativeAncestor.birthOrder;
    const egoOrder = egoParent.birthOrder;
    if (relOrder !== undefined && relOrder !== null && egoOrder !== undefined && egoOrder !== null && relOrder !== egoOrder) {
      return relOrder < egoOrder ? "ELDER" : "YOUNGER";
    }

    const relYear = relativeAncestor.birthYear;
    const egoYear = egoParent.birthYear;
    if (relYear !== undefined && relYear !== null && egoYear !== undefined && egoYear !== null && relYear !== egoYear) {
      return relYear < egoYear ? "ELDER" : "YOUNGER";
    }

    return "UNKNOWN";
  }

  private genderOf(person: PersonLookupSource | undefined): Gender | null {
    if (!person || !person.gender) return null;
    const g = person.gender.trim().toLowerCase();
    if (g === "male") return "MALE";
    if (g === "female") return "FEMALE";
    return null;
  }
}
