export type TreeWorkspaceViewMode = "list" | "graph";
export const TREE_WORKSPACE_VIEW_MODE_KEY = "cgp_tree_workspace_view_v2";
export const LEGACY_TREE_WORKSPACE_VIEW_MODE_KEY = "cgp_tree_workspace_view_v1";

type ReadableTreeWorkspaceStorage = Pick<Storage, "getItem"> & Partial<Pick<Storage, "setItem">>;

export function readTreeWorkspaceViewMode(
  storage?: ReadableTreeWorkspaceStorage,
  fallback: TreeWorkspaceViewMode = "list",
): TreeWorkspaceViewMode {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s) return fallback;
    const value = s.getItem(TREE_WORKSPACE_VIEW_MODE_KEY);
    if (value === "list" || value === "graph") return value;

    const legacyValue = s.getItem(LEGACY_TREE_WORKSPACE_VIEW_MODE_KEY);
    if (legacyValue === "focus" || legacyValue === "list" || legacyValue === "graph") {
      const migratedMode: TreeWorkspaceViewMode = legacyValue === "graph" ? "graph" : "list";
      try {
        s.setItem?.(TREE_WORKSPACE_VIEW_MODE_KEY, migratedMode);
      } catch {
        // The migrated value remains usable even when persistence is unavailable.
      }
      return migratedMode;
    }

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
