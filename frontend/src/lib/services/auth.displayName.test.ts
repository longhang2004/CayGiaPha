import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  update: vi.fn(),
  rateCheck: vi.fn(),
}));

vi.mock("../db", () => ({
  db: { select: mocks.select, update: mocks.update },
}));
vi.mock("./rateLimiter", () => ({
  hashRateLimitIdentifier: (value: string) => `hash:${value.trim().toLowerCase()}`,
  rateLimiter: { check: mocks.rateCheck },
}));

import { AuthService, sessionService } from "./auth";

describe("Google existing-account display name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.rateCheck.mockResolvedValue(undefined);
  });

  it("signs in without requiring or overwriting displayName", async () => {
    mocks.where.mockResolvedValue([{
      id: "existing-user",
      email: "existing@example.test",
      displayName: "Tên Đã Lưu",
      verified: true,
    }]);
    const service = new AuthService();
    (service as unknown as { googleClient: unknown }).googleClient = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({ email: "existing@example.test", email_verified: true }),
      }),
    };
    const session = { userId: "existing-user", rawToken: "token" };
    vi.spyOn(sessionService, "create").mockResolvedValue(session as never);

    await expect(service.verifyGoogleAuth("credential")).resolves.toBe(session);
    expect(mocks.rateCheck).toHaveBeenCalledWith(
      "google-identity:hash:existing@example.test",
      { failClosed: true },
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("requires an explicit displayName before creating a new Google account", async () => {
    mocks.where.mockResolvedValue([]);
    const service = new AuthService();
    (service as unknown as { googleClient: unknown }).googleClient = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({ email: "new-user@example.test", email_verified: true }),
      }),
    };

    await expect(
      service.verifyGoogleAuth("credential", "Bac", true, true),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "displayName" });
  });

  it("rejects a Google identity whose email is not verified", async () => {
    const service = new AuthService();
    (service as unknown as { googleClient: unknown }).googleClient = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({ email: "unverified@example.test", email_verified: false }),
      }),
    };

    await expect(service.verifyGoogleAuth("credential")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "idToken",
    });
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
