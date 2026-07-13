import { beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  innerJoin: vi.fn(),
  where: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
  rateCheck: vi.fn(),
}));

vi.mock("@/lib/services/authorization", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { select: mocks.select, insert: mocks.insert } }));
vi.mock("@/lib/services/rateLimiter", () => ({
  rateLimiter: { check: mocks.rateCheck },
}));

import { GET, POST } from "./route";

describe("GET /api/v1/trees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const selectBuilder = { from: mocks.from, innerJoin: mocks.innerJoin, where: mocks.where };
    const insertBuilder = { values: mocks.values, returning: mocks.returning };
    mocks.select.mockReturnValue(selectBuilder);
    mocks.from.mockReturnValue(selectBuilder);
    mocks.innerJoin.mockReturnValue(selectBuilder);
    mocks.insert.mockReturnValue(insertBuilder);
    mocks.values.mockReturnValue(insertBuilder);
    mocks.returning.mockResolvedValue([{ id: "created-tree" }]);
    mocks.rateCheck.mockResolvedValue(undefined);
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

  it("creates every later tree only from an explicit request without collapsing prior trees", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 40 }),
            region: fc.constantFrom("Bac", "Trung", "Nam"),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        async (commands) => {
          vi.clearAllMocks();
          const insertBuilder = { values: mocks.values, returning: mocks.returning };
          mocks.insert.mockReturnValue(insertBuilder);
          mocks.values.mockReturnValue(insertBuilder);
          mocks.returning.mockResolvedValue([{ id: "created-tree" }]);
          mocks.rateCheck.mockResolvedValue(undefined);
          mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1", role: "user" });

          for (const command of commands) {
            const response = await POST(new Request("http://localhost/api/v1/trees", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(command),
            }));
            expect(response.status).toBe(200);
          }

          expect(mocks.insert).toHaveBeenCalledTimes(commands.length);
          expect(mocks.values).toHaveBeenCalledTimes(commands.length);
          commands.forEach((command, index) => {
            expect(mocks.values).toHaveBeenNthCalledWith(
              index + 1,
              expect.objectContaining({
                ownerUserId: "u1",
                name: command.name.trim() || "Cây Gia Phả mới",
                region: command.region,
              }),
            );
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});
