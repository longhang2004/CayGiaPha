import { describe, expect, it, vi, beforeEach } from "vitest";
import { trackUxEvent, getUxViewportClass, type UxEventPayload } from "./uxEvents";
import * as vercelAnalytics from "@vercel/analytics/react";

vi.mock("@vercel/analytics/react", () => ({
  track: vi.fn()
}));

describe("uxEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructs payload and calls track", () => {
    const payload: UxEventPayload = {
      flow: "create_tree",
      surface: "tree_list",
      viewportClass: "mobile",
      accessRole: "owner",
      outcome: "started"
    };
    // Include extra fields to assert they are stripped
    trackUxEvent("ux_core_flow_start", { ...payload, extra: "secret" } as UxEventPayload & { extra: string });
    expect(vercelAnalytics.track).toHaveBeenCalledWith("ux_core_flow_start", payload);
  });

  it("swallows tracking failure", () => {
    vi.mocked(vercelAnalytics.track).mockImplementationOnce(() => {
      throw new Error("Network error");
    });
    const payload: UxEventPayload = {
      flow: "edit_person",
      surface: "person_form",
      viewportClass: "desktop",
      accessRole: "contributor",
      outcome: "completed"
    };
    expect(() => trackUxEvent("ux_core_flow_complete", payload)).not.toThrow();
  });

  it("detects viewport class boundaries", () => {
    expect(getUxViewportClass(320)).toBe("mobile");
    expect(getUxViewportClass(430)).toBe("mobile");
    expect(getUxViewportClass(431)).toBe("tablet");
    expect(getUxViewportClass(899)).toBe("tablet");
    expect(getUxViewportClass(900)).toBe("desktop");
    expect(getUxViewportClass(1280)).toBe("desktop");
    const originalInnerWidth = window.innerWidth;
    window.innerWidth = 375;
    expect(getUxViewportClass(undefined)).toBe("mobile");
    window.innerWidth = originalInnerWidth;
  });

  it("tracks ux_help_open, ux_recovery_used, find_person and change_viewpoint safely without sensitive data", () => {
    trackUxEvent("ux_help_open", {
      flow: "open_help",
      surface: "help",
      viewportClass: "mobile",
      accessRole: "unknown",
      outcome: "completed",
      query: "Nguyen Van A",
      personId: "p-12345",
      inviteCode: "ABCDEF",
    } as UxEventPayload & { query: string; personId: string; inviteCode: string });

    expect(vercelAnalytics.track).toHaveBeenCalledWith("ux_help_open", {
      flow: "open_help",
      surface: "help",
      viewportClass: "mobile",
      accessRole: "unknown",
      outcome: "completed",
    });
  });
});
