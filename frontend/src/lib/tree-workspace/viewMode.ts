export type TreeWorkspaceViewMode = "focus" | "list" | "graph";
export const TREE_WORKSPACE_VIEW_MODE_KEY = "cgp_tree_workspace_view_v1";

export function readTreeWorkspaceViewMode(storage?: Pick<Storage, "getItem">, fallback: TreeWorkspaceViewMode = "focus"): TreeWorkspaceViewMode {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s) return fallback;
    const value = s.getItem(TREE_WORKSPACE_VIEW_MODE_KEY);
    if (value === "focus" || value === "list" || value === "graph") return value;
    return fallback;
  } catch {
    return fallback;
  }
}

export function writeTreeWorkspaceViewMode(mode: TreeWorkspaceViewMode, storage?: Pick<Storage, "setItem">): void {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    if (s) s.setItem(TREE_WORKSPACE_VIEW_MODE_KEY, mode);
  } catch {
    // Ignore storage exceptions
  }
}
