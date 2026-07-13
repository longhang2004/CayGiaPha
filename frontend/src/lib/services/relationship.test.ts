import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  delete: vi.fn(),
  deleteWhere: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  evict: vi.fn(),
  resolveDerivedAddress: vi.fn(),
}));

vi.mock("../db", () => {
  const selectBuilder = {
    from: (...args: unknown[]) => {
      mocks.from(...args);
      return selectBuilder;
    },
    where: (...args: unknown[]) => mocks.where(...args),
  };
  const deleteBuilder = { where: (...args: unknown[]) => mocks.deleteWhere(...args) };
  const insertBuilder = {
    values: (...args: unknown[]) => {
      mocks.values(...args);
      return insertBuilder;
    },
    returning: (...args: unknown[]) => mocks.returning(...args),
  };
  const updateBuilder = {
    set: (...args: unknown[]) => {
      mocks.set(...args);
      return updateBuilder;
    },
    where: (...args: unknown[]) => {
      mocks.deleteWhere(...args);
      return updateBuilder;
    },
    returning: (...args: unknown[]) => mocks.returning(...args),
  };
  return {
    db: {
      select: (...args: unknown[]) => {
        mocks.select(...args);
        return selectBuilder;
      },
      delete: (...args: unknown[]) => {
        mocks.delete(...args);
        return deleteBuilder;
      },
      insert: (...args: unknown[]) => {
        mocks.insert(...args);
        return insertBuilder;
      },
      update: (...args: unknown[]) => {
        mocks.update(...args);
        return updateBuilder;
      },
    },
  };
});
vi.mock("./kinship/address", () => ({
  projectionCache: { evict: mocks.evict },
  kinshipAddressService: { resolveDerivedAddress: mocks.resolveDerivedAddress },
}));

import { RelationshipService } from "./relationship";

describe("RelationshipService mutation safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.where.mockReset();
    mocks.returning.mockReset();
    mocks.deleteWhere.mockResolvedValue(undefined);
    mocks.returning.mockResolvedValue([{ id: "new-edge" }]);
    mocks.resolveDerivedAddress.mockReset();
  });

  it("does not delete an existing edge before validating the replacement payload", async () => {
    mocks.where
      .mockResolvedValueOnce([{ id: "source" }])
      .mockResolvedValueOnce([{ id: "target" }])
      .mockResolvedValueOnce([{ id: "existing-edge" }]);

    await expect(new RelationshipService().create({
      treeId: "tree",
      type: "marriage",
      sourceId: "source",
      targetId: "target",
      maritalStatus: "invalid",
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "maritalStatus" });

    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects an exact duplicate instead of overwriting it", async () => {
    mocks.where
      .mockResolvedValueOnce([{ id: "source" }])
      .mockResolvedValueOnce([{ id: "target" }])
      .mockResolvedValueOnce([{ id: "existing-edge" }]);

    await expect(new RelationshipService().create({
      treeId: "tree",
      type: "asserted",
      sourceId: "source",
      targetId: "target",
      assertedLabel: "bác",
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "relationship" });

    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("updates spouse status by relationship id without creating a second edge", async () => {
    mocks.where.mockResolvedValueOnce([{
      id: "marriage-1",
      treeId: "tree",
      type: "marriage",
      sourceId: "source",
      targetId: "target",
    }]);
    mocks.returning.mockResolvedValueOnce([{
      id: "marriage-1",
      treeId: "tree",
      type: "marriage",
      maritalStatus: "divorced",
    }]);

    const result = await new RelationshipService().update("tree", "marriage-1", {
      maritalStatus: "divorced",
    });

    expect(result.edge).toMatchObject({ id: "marriage-1", maritalStatus: "divorced" });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.set).toHaveBeenCalledWith({ maritalStatus: "divorced" });
  });

  it("deletes only the requested relationship after verifying its tree", async () => {
    mocks.where.mockResolvedValueOnce([{
      id: "edge-1",
      treeId: "tree",
      type: "asserted",
    }]);

    await new RelationshipService().delete("tree", "edge-1");
    expect(mocks.delete).toHaveBeenCalledTimes(1);
    expect(mocks.evict).toHaveBeenCalledWith("tree");
  });

  it("verifies an asserted label when a new primitive path resolves to the same term", async () => {
    mocks.where
      .mockResolvedValueOnce([{
        id: "asserted-1",
        treeId: "tree",
        type: "asserted",
        sourceId: "source",
        targetId: "target",
        assertedLabel: "bác",
        derivationState: "asserted",
      }])
      .mockResolvedValueOnce([{
        sourceId: "source",
        targetId: "target",
        type: "bloodline_father",
      }]);
    mocks.resolveDerivedAddress.mockResolvedValue({ status: "RESOLVED", term: "bác" });

    await expect(new RelationshipService().scanForUpgrades("tree")).resolves.toEqual([]);

    expect(mocks.set).toHaveBeenCalledWith({ derivationState: "verified" });
  });

  it("preserves and flags an asserted label when the derived term conflicts", async () => {
    mocks.where
      .mockResolvedValueOnce([{
        id: "asserted-1",
        treeId: "tree",
        type: "asserted",
        sourceId: "source",
        targetId: "target",
        assertedLabel: "bác",
        derivationState: "asserted",
      }])
      .mockResolvedValueOnce([{
        sourceId: "source",
        targetId: "target",
        type: "bloodline_mother",
      }]);
    mocks.resolveDerivedAddress.mockResolvedValue({ status: "RESOLVED", term: "chú" });

    await expect(new RelationshipService().scanForUpgrades("tree")).resolves.toEqual([{
      sourceId: "source",
      targetId: "target",
      assertedLabel: "bác",
      derivedTerm: "chú",
    }]);

    expect(mocks.set).toHaveBeenCalledWith({ derivationState: "conflict" });
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
