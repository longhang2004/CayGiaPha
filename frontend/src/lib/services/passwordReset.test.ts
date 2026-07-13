import { describe, expect, it, vi } from "vitest";
import { PasswordResetService, type PasswordResetDependencies } from "./passwordReset";

function dependencies(overrides: Partial<PasswordResetDependencies> = {}): PasswordResetDependencies {
  return {
    findUser: vi.fn().mockResolvedValue({ id: "u1", destination: "user@example.test" }),
    issueCode: vi.fn().mockResolvedValue(undefined),
    verifyCode: vi.fn().mockResolvedValue(undefined),
    hashPassword: vi.fn().mockResolvedValue("hash"),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    revokeSessions: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue({
      userId: "u1",
      rawToken: "fresh-token",
      expiresAt: new Date("2026-08-12T00:00:00.000Z"),
    }),
    ...overrides,
  };
}

describe("PasswordResetService", () => {
  it("does not reveal a valid but unknown account and sends no code", async () => {
    const deps = dependencies({ findUser: vi.fn().mockResolvedValue(null) });

    await expect(
      new PasswordResetService(deps).request("unknown@example.test"),
    ).resolves.toBeUndefined();
    expect(deps.issueCode).not.toHaveBeenCalled();
  });

  it("issues a password_reset code for the normalized account destination", async () => {
    const deps = dependencies();

    await new PasswordResetService(deps).request(" User@Example.Test ");

    expect(deps.findUser).toHaveBeenCalledWith("user@example.test");
    expect(deps.issueCode).toHaveBeenCalledWith("u1", "user@example.test");
  });

  it("retains recovery support for a verified legacy phone account", async () => {
    const deps = dependencies({
      findUser: vi.fn().mockResolvedValue({ id: "legacy", destination: "0987654321" }),
    });

    await new PasswordResetService(deps).request(" 0987654321 ");

    expect(deps.findUser).toHaveBeenCalledWith("0987654321");
    expect(deps.issueCode).toHaveBeenCalledWith("legacy", "0987654321");
  });

  it("verifies the code, updates the password, revokes prior sessions, and creates one fresh session", async () => {
    const deps = dependencies();

    const session = await new PasswordResetService(deps).confirm(
      "user@example.test",
      "123456",
      "newpass1",
    );

    expect(deps.verifyCode).toHaveBeenCalledWith("u1", "123456");
    expect(deps.updatePassword).toHaveBeenCalledWith("u1", "hash");
    expect(deps.revokeSessions).toHaveBeenCalledWith("u1");
    expect(deps.createSession).toHaveBeenCalledWith("u1");
    expect(session.rawToken).toBe("fresh-token");
  });

  it("changes nothing when code verification fails", async () => {
    const deps = dependencies({
      verifyCode: vi.fn().mockRejectedValue(new Error("invalid code")),
    });

    await expect(
      new PasswordResetService(deps).confirm("user@example.test", "000000", "newpass1"),
    ).rejects.toThrow("invalid code");
    expect(deps.updatePassword).not.toHaveBeenCalled();
    expect(deps.revokeSessions).not.toHaveBeenCalled();
    expect(deps.createSession).not.toHaveBeenCalled();
  });
});
