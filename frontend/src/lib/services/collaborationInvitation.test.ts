import { describe, expect, it } from "vitest";
import {
  invitationType,
  normalizeInvitationEmail,
  requireUsableInvitation,
  existingRequestOutcome,
} from "./collaborationInvitation";

describe("collaboration invitation rules", () => {
  it("classifies generic and email invitations without exposing the email", () => {
    expect(invitationType({ email: null })).toBe("generic");
    expect(invitationType({ email: "invitee@example.com" })).toBe("email");
  });

  it("normalizes email identity before comparison", () => {
    expect(normalizeInvitationEmail(" Invitee@Example.COM ")).toBe("invitee@example.com");
  });

  it("rejects expired and inactive invitations with one public message", () => {
    expect(() => requireUsableInvitation({ status: "rejected", expiresAt: new Date(Date.now() + 1000) })).toThrow("Lời mời không hợp lệ");
    expect(() => requireUsableInvitation({ status: "generic", expiresAt: new Date(Date.now() - 1000) })).toThrow("Lời mời không hợp lệ");
  });

  it("does not turn a rejected request into a successful join", () => {
    expect(existingRequestOutcome("pending")).toBe("pending");
    expect(existingRequestOutcome("joined")).toBe("joined");
    expect(() => existingRequestOutcome("rejected")).toThrow("Lời mời không hợp lệ");
  });
});
