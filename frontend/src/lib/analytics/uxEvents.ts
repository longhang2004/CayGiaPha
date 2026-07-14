import { track } from "@vercel/analytics/react";

export type UxEventName = "ux_core_flow_start" | "ux_core_flow_complete" | "ux_core_flow_error" | "ux_help_open" | "ux_recovery_used";

export interface UxEventPayload {
  flow: "create_tree" | "join_tree" | "add_first_person" | "add_relative" | "find_person" | "change_viewpoint" | "edit_person" | "open_help";
  surface: "tree_list" | "tree_empty" | "workspace_focus" | "workspace_list" | "workspace_graph" | "help" | "person_form" | "relative_form";
  viewportClass: "mobile" | "tablet" | "desktop";
  accessRole: "owner" | "contributor" | "linked" | "reader" | "unknown";
  outcome: "started" | "completed" | "validation_error" | "request_error" | "cancelled" | "retry";
}

export function getUxViewportClass(width?: number): UxEventPayload["viewportClass"] {
  const w = width ?? (typeof window !== "undefined" ? window.innerWidth : 0);
  if (w <= 430) return "mobile";
  if (w < 900) return "tablet";
  return "desktop";
}

export function trackUxEvent(name: UxEventName, payload: UxEventPayload): void {
  try {
    const safePayload = {
      flow: payload.flow,
      surface: payload.surface,
      viewportClass: payload.viewportClass,
      accessRole: payload.accessRole,
      outcome: payload.outcome,
    } satisfies Record<string, string>;
    track(name, safePayload);
  } catch {
    // Analytics failure is non-fatal and must not log the payload.
  }
}
