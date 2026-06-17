export type StepKind = "UP" | "DOWN" | "SPOUSE";
export type Side = "PATERNAL" | "MATERNAL" | "SELF";
export type ParentType = "FATHER" | "MOTHER";

export interface ParentLink {
  parentId: string;
  parentType: ParentType;
}

export interface ChildLink {
  childId: string;
  parentType: ParentType;
}

export interface Step {
  to: string;
  kind: StepKind;
  parentType: ParentType | null;
  side: () => Side | null;
}

export interface Relationship {
  id: string;
  treeId: string;
  type: string;
  sourceId: string;
  targetId: string;
  maritalStatus?: string | null;
  socialType?: string | null;
  assertedLabel?: string | null;
  derivationState: string;
}

export class KinshipGraphProjection {
  readonly treeId: string;
  private readonly parents = new Map<string, ParentLink[]>();
  private readonly children = new Map<string, ChildLink[]>();
  private readonly spouses = new Map<string, Set<string>>();
  private readonly nodesSet = new Set<string>();

  constructor(treeId: string, edges: Relationship[]) {
    this.treeId = treeId;
    this.build(edges);
  }

  static fromEdges(treeId: string, edges: Relationship[]): KinshipGraphProjection {
    return new KinshipGraphProjection(treeId, edges);
  }

  private build(edges: Relationship[]) {
    for (const edge of edges) {
      const type = edge.type;
      if (!type) continue;

      if (type === "bloodline_father") {
        this.addBloodline(edge, "FATHER");
      } else if (type === "bloodline_mother") {
        this.addBloodline(edge, "MOTHER");
      } else if (type === "marriage") {
        this.addMarriage(edge);
      }
    }
  }

  private addBloodline(edge: Relationship, parentType: ParentType) {
    const parentId = edge.sourceId;
    const childId = edge.targetId;

    if (!this.parents.has(childId)) this.parents.set(childId, []);
    this.parents.get(childId)!.push({ parentId, parentType });

    if (!this.children.has(parentId)) this.children.set(parentId, []);
    this.children.get(parentId)!.push({ childId, parentType });

    this.nodesSet.add(parentId);
    this.nodesSet.add(childId);
  }

  private addMarriage(edge: Relationship) {
    const a = edge.sourceId;
    const b = edge.targetId;

    if (!this.spouses.has(a)) this.spouses.set(a, new Set());
    this.spouses.get(a)!.add(b);

    if (!this.spouses.has(b)) this.spouses.set(b, new Set());
    this.spouses.get(b)!.add(a);

    this.nodesSet.add(a);
    this.nodesSet.add(b);
  }

  contains(nodeId: string): boolean {
    return this.nodesSet.has(nodeId);
  }

  nodes(): Set<string> {
    return this.nodesSet;
  }

  parentsOf(nodeId: string): ParentLink[] {
    return this.parents.get(nodeId) || [];
  }

  childrenOf(nodeId: string): ChildLink[] {
    return this.children.get(nodeId) || [];
  }

  spousesOf(nodeId: string): Set<string> {
    return this.spouses.get(nodeId) || new Set();
  }

  stepsFrom(nodeId: string): Step[] {
    const steps: Step[] = [];

    const parents = this.parentsOf(nodeId);
    for (const p of parents) {
      steps.push({
        to: p.parentId,
        kind: "UP",
        parentType: p.parentType,
        side: () => (p.parentType === "FATHER" ? "PATERNAL" : "MATERNAL"),
      });
    }

    const children = this.childrenOf(nodeId);
    for (const c of children) {
      steps.push({
        to: c.childId,
        kind: "DOWN",
        parentType: c.parentType,
        side: () => (c.parentType === "FATHER" ? "PATERNAL" : "MATERNAL"),
      });
    }

    const spouses = this.spousesOf(nodeId);
    for (const spouse of spouses) {
      steps.push({
        to: spouse,
        kind: "SPOUSE",
        parentType: null,
        side: () => null,
      });
    }

    return steps;
  }
}
