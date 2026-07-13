import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/services/authorization", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/lib/services/dataRights", () => ({
  dataRightsService: { listSubjectNodes: mocks.list },
}));

import { GET } from "./route";

describe("GET /api/v1/me/nodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1" });
    mocks.list.mockResolvedValue([{ personId: "p1", treeId: "t1" }]);
  });

  it("lists only nodes linked to the authenticated session user", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith("u1");
    await expect(response.json()).resolves.toEqual([{ personId: "p1", treeId: "t1" }]);
  });

  it("rejects anonymous requests without querying subject data", async () => {
    mocks.auth.mockResolvedValue({ isAuthenticated: false, userId: null });
    const response = await GET();
    expect(response.status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
