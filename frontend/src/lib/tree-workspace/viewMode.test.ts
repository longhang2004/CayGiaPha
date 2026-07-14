import { describe, expect, it, vi } from "vitest";
import { readTreeWorkspaceViewMode, writeTreeWorkspaceViewMode, TREE_WORKSPACE_VIEW_MODE_KEY } from "./viewMode";

describe("viewMode", () => {
  it("defaults to focus when storage is missing or invalid", () => {
    expect(readTreeWorkspaceViewMode()).toBe("focus");
    expect(readTreeWorkspaceViewMode(undefined, "list")).toBe("list");
    expect(readTreeWorkspaceViewMode({ getItem: () => null })).toBe("focus");
    expect(readTreeWorkspaceViewMode({ getItem: () => "invalid" })).toBe("focus");
  });

  it("reads valid persistence", () => {
    expect(readTreeWorkspaceViewMode({ getItem: () => "list" })).toBe("list");
    expect(readTreeWorkspaceViewMode({ getItem: () => "graph" })).toBe("graph");
    expect(readTreeWorkspaceViewMode({ getItem: () => "focus" })).toBe("focus");
  });

  it("handles storage exceptions", () => {
    const throwingStorage = { getItem: () => { throw new Error("SecurityError"); } };
    expect(readTreeWorkspaceViewMode(throwingStorage)).toBe("focus");
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
