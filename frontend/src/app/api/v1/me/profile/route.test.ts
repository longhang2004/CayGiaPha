import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireAccountMutation: vi.fn(),
  ensureUserDisplayNameSchema: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
}));

vi.mock("@/lib/services/authorization", () => ({
  getAuthContext: mocks.auth,
  authorizationService: { requireAuthenticatedAccountMutation: mocks.requireAccountMutation },
}));
vi.mock("@/lib/db", () => ({
  db: { update: mocks.update },
  ensureUserDisplayNameSchema: mocks.ensureUserDisplayNameSchema,
}));

import { PATCH } from "./route";

describe("PATCH /api/v1/me/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAccountMutation.mockResolvedValue(undefined);
    mocks.ensureUserDisplayNameSchema.mockResolvedValue(undefined);
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ returning: mocks.returning });
  });

  it("normalizes and updates only the authenticated account", async () => {
    mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1" });
    mocks.returning.mockResolvedValue([{ userId: "u1", displayName: "Nguyễn Văn An" }]);

    const response = await PATCH(request({ displayName: "  Nguyễn   Văn An  " }));
    expect(response.status).toBe(200);
    expect(mocks.ensureUserDisplayNameSchema).toHaveBeenCalled();
    expect(mocks.set).toHaveBeenCalledWith({ displayName: "Nguyễn Văn An" });
    await expect(response.json()).resolves.toEqual({
      userId: "u1",
      displayName: "Nguyễn Văn An",
    });
  });

  it("retries after ensuring schema when display_name column is missing", async () => {
    mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1" });
    mocks.returning
      .mockRejectedValueOnce(Object.assign(new Error('column "display_name" does not exist'), { code: "42703" }))
      .mockResolvedValueOnce([{ userId: "u1", displayName: "Long Hàng" }]);

    const response = await PATCH(request({ displayName: "Long Hàng" }));
    expect(response.status).toBe(200);
    expect(mocks.ensureUserDisplayNameSchema).toHaveBeenCalledTimes(2);
    await expect(response.json()).resolves.toEqual({
      userId: "u1",
      displayName: "Long Hàng",
    });
  });

  it("maps check-constraint violations to field validation errors", async () => {
    mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1" });
    mocks.returning.mockRejectedValue(
      Object.assign(new Error('violates check constraint "ck_users_display_name_normalized"'), {
        code: "23514",
      }),
    );

    const response = await PATCH(request({ displayName: "Long Hàng" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", field: "displayName" },
    });
  });

  it("rejects invalid input before mutation", async () => {
    mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1" });
    const response = await PATCH(request({ displayName: " \n " }));
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", field: "displayName" },
    });
  });

  it("rejects anonymous callers without mutation", async () => {
    mocks.auth.mockResolvedValue({ isAuthenticated: false, userId: null });
    const response = await PATCH(request({ displayName: "Nguyễn Văn An" }));
    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

function request(body: unknown) {
  return new Request("http://localhost/api/v1/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
