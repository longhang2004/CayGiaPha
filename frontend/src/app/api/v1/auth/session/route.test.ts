import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  ensureUserDisplayNameSchema: vi.fn(),
  needsReacceptance: vi.fn(),
}));

vi.mock("@/lib/services/authorization", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: { select: mocks.select },
  ensureUserDisplayNameSchema: mocks.ensureUserDisplayNameSchema,
}));
vi.mock("@/lib/services/consent", () => ({
  consentService: { needsReacceptance: mocks.needsReacceptance },
}));

import { GET } from "./route";

describe("GET /api/v1/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureUserDisplayNameSchema.mockResolvedValue(undefined);
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.needsReacceptance.mockResolvedValue(true);
  });

  it("returns nullable displayName with the compatible identifier", async () => {
    mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1" });
    mocks.where.mockResolvedValue([{
      id: "u1",
      phone: null,
      email: "user@example.test",
      displayName: null,
      verified: true,
      role: "user",
    }]);
    const response = await GET();
    const body = await response.json();
    expect(body).toMatchObject({
      userId: "u1",
      identifier: "user@example.test",
      displayName: null,
      consentRequired: true,
    });
    expect(body).not.toHaveProperty("treeId");
  });
});
