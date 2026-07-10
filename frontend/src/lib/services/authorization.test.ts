import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiException } from "./errors";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
}));

vi.mock("../db", () => ({ db: { select: mocks.select } }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: vi.fn() }) }));
vi.mock("./auth", () => ({ sessionService: { resolve: vi.fn() } }));

import { AuthorizationService } from "./authorization";

describe("collaboration roster authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.where });
  });

  it("allows the direct owner", async () => {
    mocks.where.mockResolvedValueOnce([{ id: "tree-1" }]).mockResolvedValueOnce([]);
    await expect(
      new AuthorizationService().requireCollaborationRosterAccess("owner", "tree-1"),
    ).resolves.toBeUndefined();
  });

  it("allows an active collaborator", async () => {
    mocks.where.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "membership" }]);
    await expect(
      new AuthorizationService().requireCollaborationRosterAccess("member", "tree-1"),
    ).resolves.toBeUndefined();
  });

  it.each([null, "claimed-only", "public-viewer", "share-token-viewer", "unrelated"])(
    "uniformly rejects non-members: %s",
    async (userId) => {
      mocks.where.mockResolvedValue([]);
      const action = new AuthorizationService().requireCollaborationRosterAccess(userId, "hidden-tree");
      await expect(action).rejects.toMatchObject({ code: "NOT_AUTHORIZED" } satisfies Partial<ApiException>);
    },
  );
});
