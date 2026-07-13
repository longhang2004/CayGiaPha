import { describe, expect, it, vi } from "vitest";
import { ClaimService, type ClaimServiceDependencies } from "./claim";

function dependencies(
  overrides: Partial<ClaimServiceDependencies> = {},
): ClaimServiceDependencies {
  return {
    findPerson: vi.fn().mockResolvedValue({ id: "p1", treeId: "t1" }),
    hasClaim: vi.fn().mockResolvedValue(false),
    findUserById: vi.fn().mockResolvedValue({
      id: "u1",
      email: "User@Example.Test",
      phone: null,
      verified: true,
    }),
    findVerifiedLegacyPhone: vi.fn().mockResolvedValue(true),
    issueCode: vi.fn().mockResolvedValue(undefined),
    verifyCode: vi.fn().mockResolvedValue(undefined),
    saveClaim: vi.fn().mockResolvedValue({
      id: "c1",
      personId: "p1",
      userId: "u1",
      claimedAt: new Date("2026-07-13T00:00:00.000Z"),
    }),
    ...overrides,
  };
}

describe("ClaimService", () => {
  it("links the node to the signed-in user and derives the tree from the person", async () => {
    const deps = dependencies();

    const result = await new ClaimService(deps).verifyClaim("p1", "u1", "123456");

    expect(deps.verifyCode).toHaveBeenCalledWith(
      "p1",
      "123456",
      ["user@example.test"],
    );
    expect(deps.saveClaim).toHaveBeenCalledWith("p1", "u1");
    expect(result).toEqual({
      claim: expect.objectContaining({ personId: "p1", userId: "u1" }),
      treeId: "t1",
    });
  });

  it("never creates a claim when the invitation destination does not match session identity", async () => {
    const deps = dependencies({
      verifyCode: vi.fn().mockRejectedValue(new Error("identity mismatch")),
    });

    await expect(
      new ClaimService(deps).verifyClaim("p1", "u1", "123456"),
    ).rejects.toThrow("identity mismatch");
    expect(deps.saveClaim).not.toHaveBeenCalled();
  });

  it("rejects an unverified session account before consuming the code", async () => {
    const deps = dependencies({
      findUserById: vi.fn().mockResolvedValue({
        id: "u1",
        email: "user@example.test",
        phone: null,
        verified: false,
      }),
    });

    await expect(
      new ClaimService(deps).verifyClaim("p1", "u1", "123456"),
    ).rejects.toMatchObject({ code: "ACCOUNT_NOT_FOUND" });
    expect(deps.verifyCode).not.toHaveBeenCalled();
    expect(deps.saveClaim).not.toHaveBeenCalled();
  });

  it("accepts phone invitations only for an existing verified legacy account", async () => {
    const deps = dependencies({ findVerifiedLegacyPhone: vi.fn().mockResolvedValue(false) });

    await expect(
      new ClaimService(deps).invite("t1", "p1", "0987654321"),
    ).rejects.toMatchObject({ code: "ACCOUNT_NOT_FOUND" });
    expect(deps.issueCode).not.toHaveBeenCalled();
  });
});
