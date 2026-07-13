import fc from "fast-check";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireContentEditor: vi.fn(),
  create: vi.fn(),
  rateCheck: vi.fn(),
}));

vi.mock("@/lib/services/authorization", () => ({
  getAuthContext: mocks.auth,
  authorizationService: { requireContentEditor: mocks.requireContentEditor },
}));
vi.mock("@/lib/services/person", () => ({
  personService: { create: mocks.create },
}));
vi.mock("@/lib/services/rateLimiter", () => ({
  rateLimiter: { check: mocks.rateCheck },
}));

import { POST } from "./route";

describe("Property 19: explicit multi-tree isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireContentEditor.mockResolvedValue(undefined);
    mocks.create.mockResolvedValue("person-created");
    mocks.rateCheck.mockResolvedValue(undefined);
  });

  it("authorizes and mutates only the treeId supplied by the request", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.uuid(), fc.uuid()).filter(([target, legacy]) => target !== legacy),
        async ([targetTreeId, legacyOwnedTreeId]) => {
          vi.clearAllMocks();
          mocks.requireContentEditor.mockResolvedValue(undefined);
          mocks.create.mockResolvedValue("person-created");
          mocks.rateCheck.mockResolvedValue(undefined);
          mocks.auth.mockResolvedValue({
            isAuthenticated: true,
            userId: "user-1",
            // A stale legacy field must never override the explicit request target.
            treeId: legacyOwnedTreeId,
          });

          const response = await POST(new Request("http://localhost/api/v1/persons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              treeId: targetTreeId,
              displayName: "Người thân",
              gender: "unknown",
            }),
          }));

          expect(response.status).toBe(201);
          expect(mocks.requireContentEditor).toHaveBeenCalledOnce();
          expect(mocks.requireContentEditor).toHaveBeenCalledWith("user-1", targetTreeId);
          expect(mocks.create).toHaveBeenCalledOnce();
          expect(mocks.create).toHaveBeenCalledWith(
            expect.objectContaining({ treeId: targetTreeId }),
          );
          expect(JSON.stringify(mocks.create.mock.calls)).not.toContain(legacyOwnedTreeId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
