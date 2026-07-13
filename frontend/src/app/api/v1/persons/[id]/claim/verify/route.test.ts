import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  verifyClaim: vi.fn(),
}));

vi.mock("@/lib/services/authorization", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/lib/services/claim", () => ({
  claimService: { verifyClaim: mocks.verifyClaim },
}));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/v1/persons/p1/claim/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/persons/:id/claim/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1", role: "user" });
    mocks.verifyClaim.mockResolvedValue({
      claim: { id: "c1", personId: "p1", userId: "u1", claimedAt: new Date() },
      treeId: "t1",
    });
  });

  it("binds verification to the signed-in user and accepts only a code", async () => {
    const response = await POST(request({ code: "123456" }), { params: { id: "p1" } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      personId: "p1",
      treeId: "t1",
      claimed: true,
    });
    expect(mocks.verifyClaim).toHaveBeenCalledWith("p1", "u1", "123456");
  });

  it("rejects an unauthenticated recipient before claim verification", async () => {
    mocks.auth.mockResolvedValue({ isAuthenticated: false, userId: null, role: null });

    const response = await POST(request({ code: "123456" }), { params: { id: "p1" } });

    expect(response.status).toBe(403);
    expect(mocks.verifyClaim).not.toHaveBeenCalled();
  });
});
