import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), cookieSet: vi.fn(), rateCheck: vi.fn() }));

vi.mock("@/lib/services/passwordReset", () => ({
  passwordResetService: { confirm: mocks.confirm },
}));
vi.mock("@/lib/services/rateLimiter", () => ({
  rateLimiter: { check: mocks.rateCheck },
  hashRateLimitIdentifier: (value: string) => `hash:${value.trim().toLowerCase()}`,
}));
vi.mock("next/headers", () => ({ cookies: () => ({ set: mocks.cookieSet }) }));

import { POST } from "./route";

describe("POST /api/v1/auth/password-reset/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateCheck.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue({
      userId: "u1",
      rawToken: "fresh-token",
      expiresAt: new Date("2026-08-12T00:00:00.000Z"),
    });
  });

  it("sets a fresh 30-day HttpOnly session after confirmation", async () => {
    const response = await POST(new Request("http://localhost/api/v1/auth/password-reset/confirm", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.5" },
      body: JSON.stringify({ identifier: "user@example.test", code: "123456", password: "newpass1" }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.confirm).toHaveBeenCalledWith("user@example.test", "123456", "newpass1");
    expect(mocks.cookieSet).toHaveBeenCalledWith("SESSION", "fresh-token", expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    }));
  });
});
