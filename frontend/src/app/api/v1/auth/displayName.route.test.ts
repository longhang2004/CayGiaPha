import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  verifyGoogleAuth: vi.fn(),
  createSession: vi.fn(),
  rateCheck: vi.fn(),
  auditRecord: vi.fn(),
  cookieSet: vi.fn(),
}));

vi.mock("@/lib/services/auth", () => ({
  authService: { signUp: mocks.signUp, verifyGoogleAuth: mocks.verifyGoogleAuth },
  sessionService: { create: mocks.createSession },
}));
vi.mock("@/lib/services/rateLimiter", () => ({ rateLimiter: { check: mocks.rateCheck } }));
vi.mock("@/lib/services/audit", () => ({
  auditService: { record: mocks.auditRecord },
  AuditActions: { SIGN_UP_VERIFIED: "SIGN_UP_VERIFIED", SIGN_IN: "SIGN_IN" },
}));
vi.mock("next/headers", () => ({ cookies: () => ({ set: mocks.cookieSet }) }));

import { POST as signup } from "./signup/route";
import { POST as google } from "./google/route";

describe("display-name auth route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateCheck.mockResolvedValue(undefined);
    mocks.auditRecord.mockResolvedValue(undefined);
    mocks.createSession.mockResolvedValue({ rawToken: "raw", userId: "u1" });
  });

  it("passes displayName into password signup before creating the session", async () => {
    mocks.signUp.mockResolvedValue({ userId: "u1", treeId: "t1", verified: true });
    const response = await signup(jsonRequest("/api/v1/auth/signup", {
      identifier: "user@example.test",
      password: "password123",
      region: "Bac",
      acceptedTos: true,
      acceptedPrivacy: true,
      displayName: "  Nguyễn   Văn An ",
    }));

    expect(response.status).toBe(201);
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      displayName: "  Nguyễn   Văn An ",
    }));
    expect(mocks.createSession).toHaveBeenCalledWith("u1");
  });

  it("passes optional displayName to the Google service", async () => {
    mocks.verifyGoogleAuth.mockResolvedValue({
      rawToken: "raw",
      userId: "u1",
      expiresAt: new Date("2030-01-01T00:00:00Z"),
    });
    const response = await google(jsonRequest("/api/v1/auth/google", {
      idToken: "google-token",
      region: "Nam",
      acceptedTos: true,
      acceptedPrivacy: true,
      displayName: "Nguyễn Văn An",
    }));

    expect(response.status).toBe(200);
    expect(mocks.verifyGoogleAuth).toHaveBeenCalledWith(
      "google-token", "Nam", true, true, "Nguyễn Văn An",
    );
  });
});

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
