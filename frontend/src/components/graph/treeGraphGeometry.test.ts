import { describe, expect, it } from "vitest";
import { layoutMultiTreeNodes, type Person, type Relationship } from "@/lib/graph";
import { MOCK_PERSONS, MOCK_RELATIONSHIPS } from "@/lib/prototype/mockData";
import {
  getGraphWorldSize,
  getRectangleBoundaryPoint,
  getTreeGraphMetrics,
} from "./treeGraphGeometry";

describe("tree graph geometry", () => {
  it.each([
    [100, 176, 128],
    [150, 192, 156],
    [200, 208, 184],
  ])("derives compact node metrics at %i%% text scale", (scale, nodeWidth, nodeHeight) => {
    expect(getTreeGraphMetrics(scale)).toEqual({
      nodeWidth,
      nodeHeight,
      horizontalGap: 24,
      generationGap: 96,
      componentGap: 72,
      worldPadding: 64,
      cellWidth: nodeWidth + 24,
      cellHeight: nodeHeight + 96,
    });
  });

  it("clamps text scale before interpolating dimensions", () => {
    expect(getTreeGraphMetrics(50)).toEqual(getTreeGraphMetrics(100));
    expect(getTreeGraphMetrics(250)).toEqual(getTreeGraphMetrics(200));
  });

  it("uses actual card edges for disconnected-component spacing", () => {
    const metrics = getTreeGraphMetrics(100);
    const persons: Person[] = [
      { id: "left", displayName: "Nhánh trái" },
      { id: "right", displayName: "Nhánh phải" },
    ];

    const positions = layoutMultiTreeNodes(persons, [], {
      cellWidth: metrics.cellWidth,
      cellHeight: metrics.cellHeight,
      nodeWidth: metrics.nodeWidth,
      paddingX: metrics.nodeWidth / 2 + metrics.worldPadding,
      paddingY: metrics.nodeHeight / 2 + metrics.worldPadding,
      componentGap: metrics.componentGap,
    });

    const left = positions.get("left")!;
    const right = positions.get("right")!;
    expect(right.x - left.x - metrics.nodeWidth).toBe(metrics.componentGap);
  });

  it("separates generations by node height plus the generation gap", () => {
    const metrics = getTreeGraphMetrics(100);
    const persons: Person[] = [
      { id: "parent", displayName: "Cha" },
      { id: "child", displayName: "Con" },
    ];
    const relationships: Relationship[] = [{
      id: "parent-child",
      type: "bloodline_father",
      sourceId: "parent",
      targetId: "child",
      derivationState: "derived",
    }];

    const positions = layoutMultiTreeNodes(persons, relationships, {
      cellWidth: metrics.cellWidth,
      cellHeight: metrics.cellHeight,
      nodeWidth: metrics.nodeWidth,
      paddingX: metrics.nodeWidth / 2 + metrics.worldPadding,
      paddingY: metrics.nodeHeight / 2 + metrics.worldPadding,
      componentGap: metrics.componentGap,
    });

    expect(positions.get("child")!.y - positions.get("parent")!.y).toBe(metrics.cellHeight);
  });

  it("makes the prototype fixture at least 25% narrower than the previous layout", () => {
    const previousMaxNodeWidth = Math.max(...MOCK_PERSONS.map((person) => {
      const nameLength = Array.from(person.displayName || "").length;
      const statusWidth = (person.claimed ? 18 : 0) + (person.deceased ? 18 : 0) + (person.id === "ego" ? 38 : 0);
      return Math.ceil(Math.min(460, Math.max(220, 112 + statusWidth + nameLength * 9.2)));
    }));
    const previousPositions = layoutMultiTreeNodes(MOCK_PERSONS, MOCK_RELATIONSHIPS, {
      cellWidth: previousMaxNodeWidth + 40,
      cellHeight: 150,
      padding: 100,
    });
    const previousRightmostCenter = Math.max(...Array.from(previousPositions.values(), (position) => position.x));
    const previousWorldWidth = previousRightmostCenter + previousMaxNodeWidth + 100;

    const metrics = getTreeGraphMetrics(100);
    const compactPositions = layoutMultiTreeNodes(MOCK_PERSONS, MOCK_RELATIONSHIPS, {
      cellWidth: metrics.cellWidth,
      cellHeight: metrics.cellHeight,
      nodeWidth: metrics.nodeWidth,
      paddingX: metrics.nodeWidth / 2 + metrics.worldPadding,
      paddingY: metrics.nodeHeight / 2 + metrics.worldPadding,
      componentGap: metrics.componentGap,
    });
    const compactWorldWidth = getGraphWorldSize(compactPositions, metrics).width;

    expect(compactWorldWidth).toBeLessThanOrEqual(previousWorldWidth * 0.75);
  });

  it("calculates a padded world size from node boundaries", () => {
    const metrics = getTreeGraphMetrics(100);
    const positions = new Map([
      ["first", { x: 152, y: 128 }],
      ["last", { x: 400, y: 352 }],
    ]);

    expect(getGraphWorldSize(positions, metrics)).toEqual({
      width: 552,
      height: 480,
    });
  });

  it.each([
    [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 88, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0, y: 200 }, { x: 0, y: 64 }],
    [{ x: 0, y: 0 }, { x: 200, y: 200 }, { x: 64, y: 64 }],
  ])("finds the card boundary toward another node", (center, toward, expected) => {
    expect(
      getRectangleBoundaryPoint(center, toward, { width: 176, height: 128 }),
    ).toEqual(expected);
  });
});
