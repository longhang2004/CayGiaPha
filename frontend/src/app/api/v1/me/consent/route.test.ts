import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireConsent: vi.fn(),
  recordConsent: vi.fn(),
}));

vi.mock("@/lib/services/authorization", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/lib/services/consent", () => ({
  consentService: {
    requireConsent: mocks.requireConsent,
    recordConsent: mocks.recordConsent,
  },
}));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/v1/me/consent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/me/consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1" });
    mocks.recordConsent.mockResolvedValue(undefined);
  });

  it("records both explicit acceptances for the authenticated session", async () => {
    const response = await POST(request({ acceptedTos: true, acceptedPrivacy: true }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ consentRequired: false });
    expect(mocks.requireConsent).toHaveBeenCalledWith(true, true);
    expect(mocks.recordConsent).toHaveBeenCalledWith("u1");
  });

  it("does not accept a user identifier from the request body", async () => {
    await POST(request({ acceptedTos: true, acceptedPrivacy: true, userId: "attacker" }));
    expect(mocks.recordConsent).toHaveBeenCalledWith("u1");
    expect(mocks.recordConsent).not.toHaveBeenCalledWith("attacker");
  });

  it("rejects an unauthenticated request", async () => {
    mocks.auth.mockResolvedValue({ isAuthenticated: false, userId: null });
    const response = await POST(request({ acceptedTos: true, acceptedPrivacy: true }));
    expect(response.status).toBe(403);
    expect(mocks.recordConsent).not.toHaveBeenCalled();
  });
});
