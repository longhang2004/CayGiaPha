import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useViewpointAddresses } from "./useViewpointAddresses";
import type { Person, Relationship } from "@/lib/graph";

describe("useViewpointAddresses", () => {
  const persons: Person[] = [{ id: "p1", displayName: "A", gender: "male" }];
  const relationships: Relationship[] = [];

  it("handles initial load and viewpoint change", async () => {
    const fetchAddresses = vi.fn().mockResolvedValue({ egoId: "p1", addresses: [] });
    const { result, rerender } = renderHook((props) => useViewpointAddresses(props), {
      initialProps: { treeId: "t1", egoId: "p1", persons, relationships, refreshKey: 0, fetchAddresses }
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.ready).toBe(false);

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.loading).toBe(false);

    // change ego
    fetchAddresses.mockResolvedValueOnce({ egoId: "p2", addresses: [] });
    rerender({ treeId: "t1", egoId: "p2", persons, relationships, refreshKey: 0, fetchAddresses });

    expect(result.current.ready).toBe(false);
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
  });

  it("aborts stale requests and ignores out-of-order results", async () => {
    let resolveFirst: any;
    const fetchAddresses = vi.fn().mockImplementation((_t, egoId, signal) => {
      if (egoId === "first") {
        return new Promise((resolve, reject) => {
          resolveFirst = resolve;
          signal.addEventListener("abort", () => reject(new DOMException("AbortError", "AbortError")));
        });
      }
      return Promise.resolve({ egoId, addresses: [] });
    });

    const { result, rerender } = renderHook((props) => useViewpointAddresses(props), {
      initialProps: { treeId: "t1", egoId: "first", persons, relationships, refreshKey: 0, fetchAddresses }
    });

    rerender({ treeId: "t1", egoId: "second", persons, relationships, refreshKey: 0, fetchAddresses });

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });

    // resolve first request after second is done
    if (resolveFirst) {
      resolveFirst({ egoId: "first", addresses: [{ personId: "p1", resolved: "test", status: "resolved" }] });
    }

    // wait a bit to ensure it doesn't overwrite
    await new Promise(r => setTimeout(r, 50));
    expect(result.current.addresses.size).toBe(0);
  });

  it("clears stale addresses on failure and exposes error", async () => {
    const fetchAddresses = vi.fn()
      .mockResolvedValueOnce({ egoId: "p1", addresses: [{ personId: "p2", resolved: "test", status: "resolved" }] })
      .mockRejectedValueOnce(new Error("Failed"));

    const { result, rerender } = renderHook((props) => useViewpointAddresses(props), {
      initialProps: { treeId: "t1", egoId: "p1", persons, relationships, refreshKey: 0, fetchAddresses }
    });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.addresses.size).toBe(1);

    // trigger failure
    rerender({ treeId: "t1", egoId: "p1", persons, relationships, refreshKey: 1, fetchAddresses });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Không tải được cách xưng hô theo người đang xét.");
    expect(result.current.ready).toBe(true);
    expect(result.current.addresses.size).toBe(0);
  });

  it("clears loading, sets ready, and clears addresses when egoId is cleared", async () => {
    const fetchAddresses = vi.fn().mockResolvedValue({ egoId: "p1", addresses: [] });
    const { result, rerender } = renderHook((props) => useViewpointAddresses(props), {
      initialProps: { treeId: "t1", egoId: "p1", persons, relationships, refreshKey: 0, fetchAddresses }
    });

    await waitFor(() => expect(result.current.ready).toBe(true));

    // Clear ego
    rerender({ treeId: "t1", egoId: "", persons, relationships, refreshKey: 0, fetchAddresses });

    expect(result.current.addresses.size).toBe(0);
    expect(result.current.ready).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("deliberately resolves old promise after abort and after ego is cleared, proving no repopulation", async () => {
    let resolveOldPromise: any;
    const fetchAddresses = vi.fn().mockImplementation((_t, egoId, signal) => {
      if (egoId === "p1") {
        return new Promise((resolve) => {
          resolveOldPromise = resolve;
        });
      }
      return Promise.resolve({ egoId, addresses: [] });
    });

    const { result, rerender } = renderHook((props) => useViewpointAddresses(props), {
      initialProps: { treeId: "t1", egoId: "p1", persons, relationships, refreshKey: 0, fetchAddresses }
    });

    expect(result.current.loading).toBe(true);

    // Clear ego
    rerender({ treeId: "t1", egoId: "", persons, relationships, refreshKey: 0, fetchAddresses });

    expect(result.current.addresses.size).toBe(0);
    expect(result.current.ready).toBe(true);

    // Now resolve the old promise
    if (resolveOldPromise) {
      resolveOldPromise({ egoId: "p1", addresses: [{ personId: "p2", resolved: "bố", status: "resolved" }] });
    }

    // Wait a bit to ensure it doesn't repopulate
    await new Promise(r => setTimeout(r, 50));
    expect(result.current.addresses.size).toBe(0);
    expect(result.current.ready).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it("resets ready status on same-count structural reference changes", async () => {
    const fetchAddresses = vi.fn().mockResolvedValue({ egoId: "p1", addresses: [] });
    const { result, rerender } = renderHook((props) => useViewpointAddresses(props), {
      initialProps: { treeId: "t1", egoId: "p1", persons, relationships, refreshKey: 0, fetchAddresses }
    });

    await waitFor(() => expect(result.current.ready).toBe(true));

    // Same count but new reference array (e.g. name changed or relation type updated)
    const newPersons: Person[] = [{ id: "p1", displayName: "A Modified", gender: "male" as const }];
    rerender({ treeId: "t1", egoId: "p1", persons: newPersons, relationships, refreshKey: 0, fetchAddresses });

    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
  });
});
