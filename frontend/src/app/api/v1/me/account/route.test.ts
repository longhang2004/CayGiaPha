import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  deleteAccount: vi.fn(),
  audit: vi.fn(),
  deleteCookie: vi.fn(),
}));
vi.mock("@/lib/services/authorization", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/lib/services/dataRights", () => ({
  dataRightsService: { deleteAccount: mocks.deleteAccount },
}));
vi.mock("@/lib/services/audit", () => ({
  auditService: { record: mocks.audit },
  AuditActions: { ACCOUNT_DELETED: "rights.account_deleted" },
}));
vi.mock("next/headers", () => ({ cookies: () => ({ delete: mocks.deleteCookie }) }));

import { DELETE } from "./route";

describe("DELETE /api/v1/me/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1" });
    mocks.deleteAccount.mockResolvedValue(undefined);
    mocks.audit.mockResolvedValue(undefined);
  });

  it("uses the authenticated account and selected linked-node strategy", async () => {
    const request = new Request("http://localhost/api/v1/me/account", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkedNodeStrategy: "delete", userId: "attacker" }),
    });
    const response = await DELETE(request);
    expect(response.status).toBe(204);
    expect(mocks.deleteAccount).toHaveBeenCalledWith("u1", "delete");
    expect(mocks.deleteCookie).toHaveBeenCalledWith("SESSION");
  });

  it("defaults to anonymizing linked nodes", async () => {
    const response = await DELETE(new Request("http://localhost/api/v1/me/account", { method: "DELETE" }));
    expect(response.status).toBe(204);
    expect(mocks.deleteAccount).toHaveBeenCalledWith("u1", "anonymize");
  });
});
