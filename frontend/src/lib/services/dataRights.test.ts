import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  selectFrom: vi.fn(),
  selectInnerJoin: vi.fn(),
  selectWhere: vi.fn(),
  delete: vi.fn(),
  deleteWhere: vi.fn(),
  update: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  transaction: vi.fn(),
  cleanup: vi.fn(),
  personDelete: vi.fn(),
}));

vi.mock("../db", () => {
  const selectBuilder = {
    from: (...args: unknown[]) => {
      mocks.selectFrom(...args);
      return selectBuilder;
    },
    innerJoin: (...args: unknown[]) => {
      mocks.selectInnerJoin(...args);
      return selectBuilder;
    },
    where: (...args: unknown[]) => mocks.selectWhere(...args),
  };
  const deleteBuilder = {
    where: (...args: unknown[]) => mocks.deleteWhere(...args),
  };
  const updateBuilder = {
    set: (...args: unknown[]) => {
      mocks.updateSet(...args);
      return updateBuilder;
    },
    where: (...args: unknown[]) => mocks.updateWhere(...args),
  };
  const mockedDb = {
    select: (...args: unknown[]) => {
      mocks.select(...args);
      return selectBuilder;
    },
    delete: (...args: unknown[]) => {
      mocks.delete(...args);
      return deleteBuilder;
    },
    update: (...args: unknown[]) => {
      mocks.update(...args);
      return updateBuilder;
    },
    transaction: (callback: (tx: unknown) => Promise<unknown>) => {
      mocks.transaction();
      return callback(mockedDb);
    },
  };
  return { db: mockedDb };
});
vi.mock("./photo", () => ({ deleteStoredPhotoObjects: mocks.cleanup }));
vi.mock("./personDeletion", () => ({
  personDeletionService: { execute: mocks.personDelete },
}));

import { trees, users } from "../db/schema";
import { DataRightsService } from "./dataRights";

describe("DataRightsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteWhere.mockResolvedValue(undefined);
    mocks.updateWhere.mockResolvedValue(undefined);
    mocks.cleanup.mockResolvedValue(undefined);
    mocks.personDelete.mockResolvedValue(undefined);
  });

  it("rejects a non-subject export without querying relationship data", async () => {
    mocks.selectWhere.mockResolvedValueOnce([]);
    const service = new DataRightsService();

    await expect(service.exportNode("p1", "not-the-subject")).rejects.toMatchObject({
      code: "NODE_NOT_ACCESSIBLE",
    });
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });

  it("deletes every owned tree in one relational transaction and cleans all photo objects", async () => {
    mocks.selectWhere
      .mockResolvedValueOnce([{ id: "t1" }, { id: "t2" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }])
      .mockResolvedValueOnce([{ objectKey: "object-1" }, { objectKey: "object-2" }]);

    const service = new DataRightsService();
    await service.deleteAccount("u1", "anonymize");

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.delete).toHaveBeenCalledWith(trees);
    expect(mocks.delete).toHaveBeenCalledWith(users);
    expect(mocks.cleanup).toHaveBeenCalledWith(
      ["object-1", "object-2"],
      "account-deletion",
    );
  });
});
