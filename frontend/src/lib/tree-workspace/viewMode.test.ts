import { describe, expect, it, vi } from "vitest";
import {
  LEGACY_TREE_WORKSPACE_VIEW_MODE_KEY,
  readTreeWorkspaceViewMode,
  TREE_WORKSPACE_VIEW_MODE_KEY,
  writeTreeWorkspaceViewMode,
} from "./viewMode";

describe("viewMode", () => {
  it("uses the version 2 preference key", () => {
    expect(TREE_WORKSPACE_VIEW_MODE_KEY).toBe("cgp_tree_workspace_view_v2");
    expect(LEGACY_TREE_WORKSPACE_VIEW_MODE_KEY).toBe("cgp_tree_workspace_view_v1");
  });

  it("defaults to list when storage is missing or invalid", () => {
    expect(readTreeWorkspaceViewMode()).toBe("list");
    expect(readTreeWorkspaceViewMode(undefined, "graph")).toBe("graph");
    expect(readTreeWorkspaceViewMode({ getItem: () => null })).toBe("list");
    expect(readTreeWorkspaceViewMode({ getItem: () => "invalid" })).toBe("list");
  });

  it("reads valid version 2 persistence before consulting the legacy key", () => {
    const storage = {
      getItem: vi.fn((key: string) => (
        key === TREE_WORKSPACE_VIEW_MODE_KEY ? "graph" : "list"
      )),
    };

    expect(readTreeWorkspaceViewMode(storage)).toBe("graph");
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(storage.getItem).toHaveBeenCalledWith(TREE_WORKSPACE_VIEW_MODE_KEY);
  });

  it.each([
    ["focus", "list"],
    ["list", "list"],
    ["graph", "graph"],
  ] as const)("migrates legacy %s to %s", (legacyMode, expectedMode) => {
    const storage = {
      getItem: vi.fn((key: string) => (
        key === LEGACY_TREE_WORKSPACE_VIEW_MODE_KEY ? legacyMode : null
      )),
    };

    expect(readTreeWorkspaceViewMode(storage)).toBe(expectedMode);
    expect(storage.getItem).toHaveBeenNthCalledWith(1, TREE_WORKSPACE_VIEW_MODE_KEY);
    expect(storage.getItem).toHaveBeenNthCalledWith(2, LEGACY_TREE_WORKSPACE_VIEW_MODE_KEY);
  });

  it("persists a normalized legacy preference when storage is writable", () => {
    const storage = {
      getItem: vi.fn((key: string) => (
        key === LEGACY_TREE_WORKSPACE_VIEW_MODE_KEY ? "focus" : null
      )),
      setItem: vi.fn(),
    };

    expect(readTreeWorkspaceViewMode(storage)).toBe("list");
    expect(storage.setItem).toHaveBeenCalledWith(TREE_WORKSPACE_VIEW_MODE_KEY, "list");
  });

  it("handles storage exceptions", () => {
    const throwingStorage = { getItem: () => { throw new Error("SecurityError"); } };
    expect(readTreeWorkspaceViewMode(throwingStorage)).toBe("list");
  });

  it("writes view mode", () => {
    const storage = { setItem: vi.fn() };
    writeTreeWorkspaceViewMode("list", storage);
    expect(storage.setItem).toHaveBeenCalledWith(TREE_WORKSPACE_VIEW_MODE_KEY, "list");
  });

  it("ignores write errors gracefully", () => {
    const throwingStorage = { setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(() => writeTreeWorkspaceViewMode("graph", throwingStorage)).not.toThrow();
  });
});
