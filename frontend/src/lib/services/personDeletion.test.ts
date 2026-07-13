import { describe, expect, it } from "vitest";
import { planCascadeRemoval } from "./personDeletion";

describe("planCascadeRemoval", () => {
  it("removes only nodes made edgeless by the target deletion", () => {
    const edges = [
      { sourceId: "target", targetId: "orphan" },
      { sourceId: "target", targetId: "connected" },
      { sourceId: "connected", targetId: "survivor" },
    ];

    expect(planCascadeRemoval(edges, "target").sort()).toEqual(["orphan", "target"]);
  });

  it("does not sweep nodes that were independently isolated", () => {
    expect(planCascadeRemoval([], "target")).toEqual(["target"]);
  });
});
