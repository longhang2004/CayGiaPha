import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  erase: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/services/authorization", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/lib/services/dataRights", () => ({ dataRightsService: { eraseNode: mocks.erase } }));
vi.mock("@/lib/services/audit", () => ({
  auditService: { record: mocks.audit },
  AuditActions: { NODE_ERASED: "rights.node_erased" },
}));

import { POST } from "./route";

describe("POST /api/v1/me/nodes/:personId/erase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ isAuthenticated: true, userId: "u1" });
    mocks.erase.mockResolvedValue(undefined);
    mocks.audit.mockResolvedValue(undefined);
  });

  it("passes the deletion choice with the authenticated subject identity", async () => {
    const request = new Request("http://localhost/api/v1/me/nodes/p1/erase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ strategy: "delete", deletionStrategy: "cascade", userId: "attacker" }),
    });
    const response = await POST(request, { params: { personId: "p1" } });
    expect(response.status).toBe(204);
    expect(mocks.erase).toHaveBeenCalledWith("p1", "delete", "u1", "cascade");
  });
});
