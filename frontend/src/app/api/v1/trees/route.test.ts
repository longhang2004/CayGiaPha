import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  innerJoin: vi.fn(),
  where: vi.fn(),
}));

vi.mock("@/lib/services/authorization", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { select: mocks.select } }));

import { GET } from "./route";

describe("GET /api/v1/trees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = { from: mocks.from, innerJoin: mocks.innerJoin, where: mocks.where };
    mocks.select.mockReturnValue(builder);
    mocks.from.mockReturnValue(builder);
    mocks.innerJoin.mockReturnValue(builder);
    mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1", role: "user" });
  });

  it("lists owned, contributed, and linked trees with their strongest access role", async () => {
    mocks.where
      .mockResolvedValueOnce([{ id: "owned", ownerUserId: "u1", name: "Owned" }])
      .mockResolvedValueOnce([
        { id: "contributed", ownerUserId: "u2", name: "Contributed" },
        { id: "owned", ownerUserId: "u1", name: "Owned" },
      ])
      .mockResolvedValueOnce([
        { id: "linked", ownerUserId: "u3", name: "Linked" },
        { id: "contributed", ownerUserId: "u2", name: "Contributed" },
      ]);

    const response = await GET();
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({ id: "owned", accessRole: "OWNER", isOwner: true }),
      expect.objectContaining({ id: "contributed", accessRole: "CONTRIBUTOR", isOwner: false }),
      expect.objectContaining({ id: "linked", accessRole: "LINKED", isOwner: false }),
    ]);
  });
});
