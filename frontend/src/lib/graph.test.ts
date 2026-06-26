import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EDGE_CLASS,
  STROKE_DASHARRAY,
  UNRESOLVED_LABEL,
  addressLabel,
  capitalize,
  edgeStyleFor,
  fetchViewpointAddresses,
  indexAddresses,
  isUnresolved,
  layoutNodes,
  type Address,
  type Person,
  type Relationship,
  type ViewpointAddresses,
} from "./graph";

function rel(partial: Partial<Relationship>): Relationship {
  return {
    id: "r1",
    type: "bloodline_father",
    sourceId: "a",
    targetId: "b",
    derivationState: "derived",
    ...partial,
  };
}

describe("edgeStyleFor", () => {
  it("classifies derived bloodline and marriage edges as solid (5.3)", () => {
    expect(edgeStyleFor(rel({ type: "bloodline_father", derivationState: "derived" }))).toBe("solid");
    expect(edgeStyleFor(rel({ type: "bloodline_mother", derivationState: "derived" }))).toBe("solid");
    expect(edgeStyleFor(rel({ type: "marriage", derivationState: "derived" }))).toBe("solid");
  });

  it("classifies a verified (upgraded) edge as solid (7.2)", () => {
    expect(edgeStyleFor(rel({ type: "bloodline_father", derivationState: "verified" }))).toBe("solid");
  });

  it("classifies asserted and conflict edges as dashed (6.3, 15.6)", () => {
    expect(edgeStyleFor(rel({ type: "asserted", derivationState: "asserted" }))).toBe("dashed");
    expect(edgeStyleFor(rel({ type: "bloodline_father", derivationState: "conflict" }))).toBe("dashed");
  });

  it("classifies non-bloodline edges as the third distinct style (12.4)", () => {
    expect(edgeStyleFor(rel({ type: "non_bloodline", derivationState: "derived" }))).toBe("non-bloodline");
  });

  it("produces three mutually distinct class names and dash patterns", () => {
    const classes = new Set(Object.values(EDGE_CLASS));
    const dashes = new Set(Object.values(STROKE_DASHARRAY));
    expect(classes.size).toBe(3);
    expect(dashes.size).toBe(3);
  });
});

describe("address helpers", () => {
  const resolved: Address = { personId: "p", resolved: "bác", status: "resolved" };
  const unresolvedByStatus: Address = { personId: "p", resolved: null, status: "unresolved" };
  const unresolvedByIndicator: Address = {
    personId: "p",
    resolved: null,
    status: "resolved",
    unresolvedIndicator: "unresolved",
  };

  it("treats a missing address as unresolved (8.7 / 10.3)", () => {
    expect(isUnresolved(undefined)).toBe(true);
    expect(addressLabel(undefined)).toBe(UNRESOLVED_LABEL);
  });

  it("detects unresolved by status, indicator, or null term", () => {
    expect(isUnresolved(unresolvedByStatus)).toBe(true);
    expect(isUnresolved(unresolvedByIndicator)).toBe(true);
    expect(addressLabel(unresolvedByStatus)).toBe(UNRESOLVED_LABEL);
  });

  it("returns the resolved term for a resolved address (8.1)", () => {
    expect(isUnresolved(resolved)).toBe(false);
    expect(addressLabel(resolved)).toBe("bác");
  });

  describe("capitalize", () => {
    it("capitalizes the first letter of lowercase strings", () => {
      expect(capitalize("ba")).toBe("Ba");
      expect(capitalize("ông nội")).toBe("Ông nội");
    });

    it("handles empty or falsy strings gracefully", () => {
      expect(capitalize("")).toBe("");
      expect(capitalize(undefined as any)).toBe("");
    });
  });
});

describe("indexAddresses", () => {
  it("builds a personId → Address lookup", () => {
    const result: ViewpointAddresses = {
      egoId: "e",
      addresses: [
        { personId: "a", resolved: "anh", status: "resolved" },
        { personId: "b", resolved: null, status: "unresolved" },
      ],
    };
    const map = indexAddresses(result);
    expect(map.get("a")?.resolved).toBe("anh");
    expect(isUnresolved(map.get("b"))).toBe(true);
  });
});

describe("layoutNodes", () => {
  it("assigns a stable unique position to each person", () => {
    const persons: Person[] = [
      { id: "a", displayName: "A" },
      { id: "b", displayName: "B" },
      { id: "c", displayName: "C" },
    ];
    const positions = layoutNodes(persons, []);
    expect(positions.size).toBe(3);
    const coords = new Set([...positions.values()].map((p) => `${p.x},${p.y}`));
    expect(coords.size).toBe(3);
  });

  it("ensures root nodes have smaller y than child nodes, and spouse nodes have equal y", () => {
    const persons: Person[] = [
      { id: "father", displayName: "Father", gender: "male" },
      { id: "mother", displayName: "Mother", gender: "female" },
      { id: "child", displayName: "Child", gender: "male" },
      { id: "isolated", displayName: "Isolated" },
    ];
    const relationships: Relationship[] = [
      {
        id: "r1",
        type: "marriage",
        sourceId: "father",
        targetId: "mother",
        derivationState: "derived",
      },
      {
        id: "r2",
        type: "bloodline_father",
        sourceId: "father",
        targetId: "child",
        derivationState: "derived",
      },
    ];

    const positions = layoutNodes(persons, relationships);

    const fatherPos = positions.get("father")!;
    const motherPos = positions.get("mother")!;
    const childPos = positions.get("child")!;
    const isolatedPos = positions.get("isolated")!;

    // Father and Mother are spouses, so they must have the same y
    expect(fatherPos.y).toBe(motherPos.y);

    // Child is a descendant, so childPos.y should be greater than fatherPos.y
    expect(childPos.y).toBeGreaterThan(fatherPos.y);

    // Isolated node should not crash and should be at the bottom (greatest y)
    expect(isolatedPos.y).toBeGreaterThan(childPos.y);
  });

  it("places parents ABOVE their child even when parents are added as a separate family unit (isolated-component regression)", () => {
    // This tests the bug where an isolated sub-tree (not connected to the main
    // family) would incorrectly place parents at the same depth as their child.
    // Previously the BFS started from an arbitrary node and only traversed
    // downward, causing parents added later to appear at the same level.
    const persons: Person[] = [
      { id: "child", displayName: "Hàng Hữu Phương", gender: "male" },
      { id: "father", displayName: "Hàng Hữu Thiền", gender: "male" },
      { id: "mother", displayName: "Lê Thị My", gender: "female" },
    ];
    const relationships: Relationship[] = [
      {
        id: "r-marriage",
        type: "marriage",
        sourceId: "father",
        targetId: "mother",
        derivationState: "derived",
      },
      {
        id: "r-father",
        type: "bloodline_father",
        sourceId: "father",
        targetId: "child",
        derivationState: "derived",
      },
      {
        id: "r-mother",
        type: "bloodline_mother",
        sourceId: "mother",
        targetId: "child",
        derivationState: "derived",
      },
    ];

    // The 'child' is listed FIRST in the persons array (simulating the case
    // where parents were added AFTER the child was already in the tree).
    const positions = layoutNodes(persons, relationships);

    const childPos = positions.get("child")!;
    const fatherPos = positions.get("father")!;
    const motherPos = positions.get("mother")!;

    // Parents must be ABOVE (smaller y) the child
    expect(fatherPos.y).toBeLessThan(childPos.y);
    expect(motherPos.y).toBeLessThan(childPos.y);

    // Parents are spouses: same y
    expect(fatherPos.y).toBe(motherPos.y);
  });

  it("places parents ABOVE their child even when child has a spouse with no parents in the tree", () => {
    const persons: Person[] = [
      { id: "child", displayName: "Hàng Hữu Phương", gender: "male" },
      { id: "spouse", displayName: "Phạm Thị Cẩm Tú", gender: "female" },
      { id: "father", displayName: "Hàng Hữu Thiền", gender: "male" },
      { id: "mother", displayName: "Lê Thị My", gender: "female" },
    ];
    const relationships: Relationship[] = [
      {
        id: "r-marriage-child",
        type: "marriage",
        sourceId: "child",
        targetId: "spouse",
        derivationState: "derived",
      },
      {
        id: "r-marriage-parents",
        type: "marriage",
        sourceId: "father",
        targetId: "mother",
        derivationState: "derived",
      },
      {
        id: "r-father",
        type: "bloodline_father",
        sourceId: "father",
        targetId: "child",
        derivationState: "derived",
      },
      {
        id: "r-mother",
        type: "bloodline_mother",
        sourceId: "mother",
        targetId: "child",
        derivationState: "derived",
      },
    ];

    const positions = layoutNodes(persons, relationships);

    const childPos = positions.get("child")!;
    const spousePos = positions.get("spouse")!;
    const fatherPos = positions.get("father")!;
    const motherPos = positions.get("mother")!;

    // Parents must be ABOVE (smaller y) the child and spouse
    expect(fatherPos.y).toBeLessThan(childPos.y);
    expect(motherPos.y).toBeLessThan(childPos.y);

    // Spouse must be at the same depth as the child
    expect(spousePos.y).toBe(childPos.y);

    // Parents are spouses: same y
    expect(fatherPos.y).toBe(motherPos.y);
  });
});

describe("fetchViewpointAddresses", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the change-viewpoint all-addresses endpoint for the ego (10.1, 10.2)", async () => {
    const body: ViewpointAddresses = { egoId: "ego 1", addresses: [] };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
    }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchViewpointAddresses("tree 1", "ego 1");

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("/api/v1/trees/tree%201/viewpoint/ego%201/addresses");
    expect(result).toEqual(body);
  });
});
