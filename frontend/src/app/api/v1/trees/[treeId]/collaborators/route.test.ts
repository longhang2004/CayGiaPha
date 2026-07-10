import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiException } from "@/lib/services/errors";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireRoster: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  innerJoin: vi.fn(),
  where: vi.fn(),
}));

vi.mock("@/lib/services/authorization", () => ({
  getAuthContext: mocks.auth,
  authorizationService: { requireCollaborationRosterAccess: mocks.requireRoster },
}));
vi.mock("@/lib/db", () => ({ db: { select: mocks.select } }));

import { GET } from "./route";

describe("GET tree collaboration roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "owner-user", ownedTreeId: "tree-1" });
    mocks.requireRoster.mockResolvedValue(undefined);
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ innerJoin: mocks.innerJoin });
    mocks.innerJoin.mockReturnValue({ where: mocks.where });
  });

  it("returns a stable virtual owner followed by contributors", async () => {
    mocks.where
      .mockResolvedValueOnce([{
        treeId: "tree-1",
        userId: "owner-user",
        displayName: "Chủ Cây",
        email: "owner@example.test",
        joinedAt: new Date("2026-01-01T00:00:00Z"),
      }])
      .mockResolvedValueOnce([{
        id: "membership-1",
        treeId: "tree-1",
        userId: "contributor-user",
        displayName: null,
        email: "member@example.test",
        role: "contributor",
        joinedAt: new Date("2026-02-01T00:00:00Z"),
      }]);

    const response = await GET(new Request("http://localhost"), { params: { treeId: "tree-1" } });
    expect(mocks.requireRoster).toHaveBeenCalledWith("owner-user", "tree-1");
    await expect(response.json()).resolves.toMatchObject([
      {
        id: "owner:tree-1",
        userId: "owner-user",
        displayName: "Chủ Cây",
        email: "owner@example.test",
        role: "owner",
      },
      {
        id: "membership-1",
        userId: "contributor-user",
        displayName: null,
        email: "member@example.test",
        role: "contributor",
      },
    ]);
  });

  it("returns a uniform authorization error without querying roster data", async () => {
    mocks.requireRoster.mockRejectedValue(
      ApiException.notAuthorized("You are not authorized to view this collaboration roster."),
    );
    const response = await GET(new Request("http://localhost"), { params: { treeId: "hidden" } });
    expect(response.status).toBe(403);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ error: { code: "NOT_AUTHORIZED" } });
  });
});
