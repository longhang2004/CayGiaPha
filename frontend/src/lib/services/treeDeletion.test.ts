import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  innerJoin: vi.fn(),
  where: vi.fn(),
  transaction: vi.fn(),
  delete: vi.fn(),
  deleteWhere: vi.fn(),
  sendEmail: vi.fn(),
  cleanup: vi.fn(),
}));

vi.mock("../db", () => {
  const selectBuilder = {
    from: (...args: unknown[]) => {
      mocks.from(...args);
      return selectBuilder;
    },
    innerJoin: (...args: unknown[]) => {
      mocks.innerJoin(...args);
      return selectBuilder;
    },
    where: (...args: unknown[]) => mocks.where(...args),
  };
  return {
    db: {
      select: (...args: unknown[]) => {
        mocks.select(...args);
        return selectBuilder;
      },
      transaction: (...args: unknown[]) => mocks.transaction(...args),
    },
  };
});
vi.mock("./email", () => ({
  escapeHtml: (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"),
  sendEmail: mocks.sendEmail,
}));
vi.mock("./photo", () => ({ deleteStoredPhotoObjects: mocks.cleanup }));

import { TreeDeletionService } from "./treeDeletion";

describe("TreeDeletionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.where.mockReset();
    mocks.where
      .mockResolvedValueOnce([{ id: "tree", name: '<script>alert("x")</script>' }])
      .mockResolvedValueOnce([{ email: "contributor@example.test" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "person" }])
      .mockResolvedValueOnce([{ objectKey: "persons/person/photo" }]);
    mocks.transaction.mockImplementation(async (callback: (tx: object) => Promise<unknown>) => callback({
      delete: (...args: unknown[]) => {
        mocks.delete(...args);
        return { where: (...whereArgs: unknown[]) => mocks.deleteWhere(...whereArgs) };
      },
    }));
    mocks.deleteWhere.mockResolvedValue(undefined);
    mocks.cleanup.mockResolvedValue(undefined);
    mocks.sendEmail.mockResolvedValue(undefined);
  });

  it("notifies only after the relational transaction and object cleanup complete", async () => {
    await new TreeDeletionService().delete("tree");

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.cleanup).toHaveBeenCalledWith(["persons/person/photo"], "tree-delete");
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendEmail.mock.invocationCallOrder[0],
    );
    expect(mocks.sendEmail.mock.calls[0][0].html).toContain("&lt;script&gt;");
    expect(mocks.sendEmail.mock.calls[0][0].html).not.toContain("<script>");
  });

  it("does not clean objects or notify when the transaction fails", async () => {
    mocks.transaction.mockRejectedValueOnce(new Error("delete failed"));

    await expect(new TreeDeletionService().delete("tree")).rejects.toThrow("delete failed");
    expect(mocks.cleanup).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
