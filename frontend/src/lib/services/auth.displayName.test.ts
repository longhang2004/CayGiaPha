import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../db", () => ({
  db: { select: mocks.select, update: mocks.update },
}));

import { AuthService, sessionService } from "./auth";

describe("Google existing-account display name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.where });
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
        getPayload: () => ({ email: "existing@example.test" }),
      }),
    };
    const session = { userId: "existing-user", rawToken: "token" };
    vi.spyOn(sessionService, "create").mockResolvedValue(session as never);

    await expect(service.verifyGoogleAuth("credential")).resolves.toBe(session);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("requires an explicit displayName before creating a new Google account", async () => {
    mocks.where.mockResolvedValue([]);
    const service = new AuthService();
    (service as unknown as { googleClient: unknown }).googleClient = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({ email: "new-user@example.test" }),
      }),
    };

    await expect(
      service.verifyGoogleAuth("credential", "Bac", true, true),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "displayName" });
  });
});
