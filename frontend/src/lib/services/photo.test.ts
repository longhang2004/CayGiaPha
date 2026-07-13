import sharp from "sharp";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  transaction: vi.fn(),
  authorize: vi.fn(),
}));

vi.mock("../db", () => {
  const selectBuilder = {
    from: (...args: unknown[]) => {
      mocks.from(...args);
      return selectBuilder;
    },
    where: (...args: unknown[]) => mocks.where(...args),
  };
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
      mocks.where(...args);
      return updateBuilder;
    },
    returning: (...args: unknown[]) => mocks.returning(...args),
  };
  const db = {
    select: (...args: unknown[]) => {
      mocks.select(...args);
      return selectBuilder;
    },
    insert: (...args: unknown[]) => {
      mocks.insert(...args);
      return insertBuilder;
    },
    update: (...args: unknown[]) => {
      mocks.update(...args);
      return updateBuilder;
    },
    transaction: (...args: unknown[]) => mocks.transaction(...args),
  };
  return { db };
});
vi.mock("./authorization", () => ({
  authorizationService: {
    requireContentEditor: mocks.authorize,
    requireReadAccess: vi.fn(),
    classify: vi.fn(),
  },
}));

import { PhotoService, storageService } from "./photo";

const PERSON = { id: "person", treeId: "tree" };
let png: Buffer;

describe("PhotoService mutation safety", () => {
  beforeAll(async () => {
    png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: "#ffffff" },
    }).png().toBuffer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.where.mockReset();
    mocks.returning.mockReset();
    mocks.authorize.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (callback: (tx: object) => Promise<unknown>) => callback({
      update: (...args: unknown[]) => {
        mocks.update(...args);
        return {
          set: (...setArgs: unknown[]) => {
            mocks.set(...setArgs);
            return {
              where: (...whereArgs: unknown[]) => {
                mocks.where(...whereArgs);
                return {
                  returning: (...returningArgs: unknown[]) => mocks.returning(...returningArgs),
                };
              },
            };
          },
        };
      },
    }));
    vi.spyOn(storageService, "put").mockResolvedValue(undefined);
    vi.spyOn(storageService, "delete").mockResolvedValue(undefined);
  });

  it("removes the stored object when the database insert fails", async () => {
    mocks.where
      .mockResolvedValueOnce([PERSON])
      .mockResolvedValueOnce([]);
    mocks.returning.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(new PhotoService().upload("user", "tree", "person", png))
      .rejects.toThrow("database unavailable");

    expect(storageService.put).toHaveBeenCalledTimes(1);
    expect(storageService.delete).toHaveBeenCalledWith(expect.stringMatching(/^persons\/person\//));
  });

  it("clears and sets the primary photo inside one transaction", async () => {
    mocks.where
      .mockResolvedValueOnce([PERSON])
      .mockResolvedValueOnce([{ id: "photo", personId: "person" }]);
    mocks.returning.mockResolvedValueOnce([{ id: "photo", personId: "person", isPrimary: true }]);

    await new PhotoService().setPrimary("user", "tree", "person", "photo");

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenNthCalledWith(1, { isPrimary: false });
    expect(mocks.set).toHaveBeenNthCalledWith(2, { isPrimary: true });
  });
});
