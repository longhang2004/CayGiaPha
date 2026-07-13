import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requestReset: vi.fn(), rateCheck: vi.fn() }));

vi.mock("@/lib/services/passwordReset", () => ({
  passwordResetService: { request: mocks.requestReset },
}));
vi.mock("@/lib/services/rateLimiter", () => ({
  rateLimiter: { check: mocks.rateCheck },
  hashRateLimitIdentifier: (value: string) => `hash:${value.trim().toLowerCase()}`,
}));

import { POST } from "./route";

describe("POST /api/v1/auth/password-reset/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestReset.mockResolvedValue(undefined);
    mocks.rateCheck.mockResolvedValue(undefined);
  });

  it("returns the same accepted response without exposing account existence", async () => {
    const response = await POST(new Request("http://localhost/api/v1/auth/password-reset/request", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.5" },
      body: JSON.stringify({ identifier: "User@Example.Test" }),
    }));

    expect(response.status).toBe(202);
    expect(mocks.requestReset).toHaveBeenCalledWith("User@Example.Test");
    expect(mocks.rateCheck).toHaveBeenCalledWith(
      "password-reset:hash:user@example.test",
      { failClosed: true },
    );
    expect(mocks.rateCheck).toHaveBeenCalledWith("password-reset-ip:203.0.113.5", {
      failClosed: true,
    });
  });
});
