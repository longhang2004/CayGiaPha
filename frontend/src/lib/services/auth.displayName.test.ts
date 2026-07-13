import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
}));

vi.mock("../db", () => ({
  db: { select: mocks.select, update: mocks.update, insert: mocks.insert },
}));

import { AuthService, sessionService } from "./auth";
import { consentService } from "./consent";

describe("Google existing-account display name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.values.mockReturnValue({ returning: mocks.returning });
    vi.spyOn(consentService, "requireConsent").mockImplementation(() => {});
    vi.spyOn(consentService, "recordConsent").mockResolvedValue(undefined as never);
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

  it("falls back to Google name or email prefix when creating a new Google account", async () => {
    mocks.where.mockResolvedValue([]);
    mocks.returning.mockResolvedValue([{ id: "new-user", displayName: "new-user" }]);
    const service = new AuthService();
    (service as unknown as { googleClient: unknown }).googleClient = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({ email: "new-user@example.test" }),
      }),
    };
    const session = { userId: "new-user", rawToken: "token" };
    vi.spyOn(sessionService, "create").mockResolvedValue(session as never);

    await expect(
      service.verifyGoogleAuth("credential", "Bac", true, true),
    ).resolves.toBe(session);
  });
});
