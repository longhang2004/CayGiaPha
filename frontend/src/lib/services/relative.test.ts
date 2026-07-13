import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  createPerson: vi.fn(),
  createRelationship: vi.fn(),
  finalize: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    transaction: (...args: unknown[]) => mocks.transaction(...args),
  },
}));
vi.mock("./person", () => ({
  personService: { createWithStore: mocks.createPerson },
}));
vi.mock("./relationship", () => ({
  relationshipService: {
    createWithStore: mocks.createRelationship,
    finalizeCreatedEdge: mocks.finalize,
  },
}));

import { RelativeService } from "./relative";

describe("RelativeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (tx: object) => Promise<unknown>) => callback({ tx: true }));
    mocks.createPerson.mockResolvedValue("new-person");
    mocks.createRelationship.mockResolvedValue({ id: "new-edge" });
    mocks.finalize.mockResolvedValue({ edge: { id: "new-edge" }, conflicts: [] });
  });

  it("creates the person and relationship in the same transaction", async () => {
    const result = await new RelativeService().create({
      treeId: "tree",
      person: { displayName: "Người mới", gender: "male" },
      relationship: {
        type: "bloodline_father",
        existingPersonId: "child",
        newPersonPosition: "source",
      },
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.createPerson).toHaveBeenCalledWith(
      { tx: true },
      expect.objectContaining({ treeId: "tree", displayName: "Người mới" }),
    );
    expect(mocks.createRelationship).toHaveBeenCalledWith(
      { tx: true },
      expect.objectContaining({ sourceId: "new-person", targetId: "child" }),
    );
    expect(result.personId).toBe("new-person");
  });

  it("does not finalize when relationship creation aborts the transaction", async () => {
    mocks.createRelationship.mockRejectedValue(new Error("invalid edge"));

    await expect(new RelativeService().create({
      treeId: "tree",
      person: { displayName: "Người mới", gender: "male" },
      relationship: {
        type: "bloodline_father",
        existingPersonId: "child",
        newPersonPosition: "source",
      },
    })).rejects.toThrow("invalid edge");
    expect(mocks.finalize).not.toHaveBeenCalled();
  });
});
