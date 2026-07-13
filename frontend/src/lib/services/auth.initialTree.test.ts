import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  recordConsent: vi.fn(),
  rateCheck: vi.fn(),
}));

vi.mock("../db", () => {
  const insertBuilder = {
    values: (...args: unknown[]) => {
      mocks.values(...args);
      return insertBuilder;
    },
    returning: (...args: unknown[]) => mocks.returning(...args),
  };
  const selectBuilder = {
    from: (...args: unknown[]) => {
      mocks.from(...args);
      return selectBuilder;
    },
    where: (...args: unknown[]) => mocks.where(...args),
  };
  return {
    db: {
      insert: (...args: unknown[]) => {
        mocks.insert(...args);
        return insertBuilder;
      },
      select: (...args: unknown[]) => {
        mocks.select(...args);
        return selectBuilder;
      },
    },
  };
});
vi.mock("./consent", () => ({
  consentService: {
    requireConsent: vi.fn(),
    recordConsent: mocks.recordConsent,
  },
}));
vi.mock("./rateLimiter", () => ({
  hashRateLimitIdentifier: (value: string) => `hash:${value.trim().toLowerCase()}`,
  rateLimiter: { check: mocks.rateCheck },
}));

import { AuthService, duplicateIdentifierChecker, sessionService } from "./auth";

describe("initial tree creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recordConsent.mockResolvedValue(undefined);
    mocks.rateCheck.mockResolvedValue(undefined);
  });

  it("creates exactly one initial tree after password registration", async () => {
    vi.spyOn(duplicateIdentifierChecker, "check").mockResolvedValue("AVAILABLE");
    mocks.returning.mockResolvedValueOnce([{ id: "new-user" }]);
    const service = new AuthService();
    const createInitialTree = vi.spyOn(
      service as unknown as {
        createSingleTree: (userId: string, region: string) => Promise<{ id: string; region: string }>;
      },
      "createSingleTree",
    ).mockResolvedValue({ id: "initial-tree", region: "Nam" });

    const result = await service.signUp({
      identifier: "new@example.test",
      password: "MatKhau123",
      region: "Nam",
      acceptedTos: true,
      acceptedPrivacy: true,
      displayName: "Nguyễn Văn Minh",
    });

    expect(createInitialTree).toHaveBeenCalledOnce();
    expect(createInitialTree).toHaveBeenCalledWith("new-user", "Nam");
    expect(result.treeId).toBe("initial-tree");
  });

  it("creates exactly one initial tree after consented Google registration", async () => {
    mocks.where.mockResolvedValueOnce([]);
    mocks.returning.mockResolvedValueOnce([{ id: "google-user" }]);
    const service = new AuthService();
    (service as unknown as { googleClient: unknown }).googleClient = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({ email: "GOOGLE@EXAMPLE.TEST", email_verified: true }),
      }),
    };
    const createInitialTree = vi.spyOn(
      service as unknown as {
        createSingleTree: (userId: string, region: string) => Promise<{ id: string; region: string }>;
      },
      "createSingleTree",
    ).mockResolvedValue({ id: "google-tree", region: "Bac" });
    vi.spyOn(sessionService, "create").mockResolvedValue({
      id: "session-id",
      userId: "google-user",
      rawToken: "session-token",
      tokenHash: "session-token-hash",
      createdAt: new Date("2029-12-01T00:00:00Z"),
      expiresAt: new Date("2030-01-01T00:00:00Z"),
      revoked: false,
    });

    await service.verifyGoogleAuth(
      "credential",
      "Bac",
      true,
      true,
      "Nguyễn Văn Minh",
    );

    expect(mocks.recordConsent).toHaveBeenCalledWith("google-user");
    expect(createInitialTree).toHaveBeenCalledOnce();
    expect(createInitialTree).toHaveBeenCalledWith("google-user", "Bac");
  });
});
