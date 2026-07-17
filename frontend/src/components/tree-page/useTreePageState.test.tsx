import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTreePageState } from "./useTreePageState";

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  getCollaborators: vi.fn(),
  router: { push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/app/providers", () => ({
  useSession: () => ({
    user: { userId: "user-1", displayName: "An" },
    loading: false,
  }),
}));

vi.mock("@/lib/apiClient", () => {
  class ApiError extends Error {
    status: number;

    constructor(status: number, message = "API error") {
      super(message);
      this.status = status;
    }
  }

  return {
    api: { get: mocks.apiGet },
    ApiError,
  };
});

vi.mock("@/lib/collaboration", () => ({
  getCollaborators: mocks.getCollaborators,
}));

vi.mock("./useViewpointAddresses", () => ({
  useViewpointAddresses: () => ({
    addresses: new Map(),
    loading: false,
    ready: true,
    error: null,
  }),
}));

const NO_CAPABILITIES = {
  editContent: false,
  editRelationships: false,
  editPhotos: false,
  editVisibility: false,
  manageClaim: false,
  manageTree: false,
  manageCollaboration: false,
};

const OWNER_CAPABILITIES = Object.fromEntries(
  Object.keys(NO_CAPABILITIES).map((key) => [key, true]),
);

function treePayload(name: string, overrides: Record<string, unknown> = {}) {
  return {
    name,
    region: "Nam",
    sharing: "private",
    livingRedaction: true,
    persons: [{ id: "p1", displayName: "An", gender: "male" }],
    relationships: [],
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useTreePageState tree-detail boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCollaborators.mockResolvedValue([]);
  });

  it("does not crash when the deployed Spring response omits capability fields", async () => {
    mocks.apiGet.mockResolvedValue({
      name: "Cây họ Nguyễn",
      region: "Nam",
      sharing: "private",
      livingRedaction: true,
      persons: [{ id: "p1", displayName: "An", gender: "male" }],
      relationships: [],
    });

    const { result } = renderHook(() => useTreePageState("tree-1", null));

    await waitFor(() => expect(result.current.loadingData).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.capabilities).toEqual(NO_CAPABILITIES);
    expect(result.current.canEdit).toBe(false);
    expect(result.current.persons[0].capabilities).toEqual(NO_CAPABILITIES);
    expect(result.current.treeName).toBe("Cây họ Nguyễn");
  });

  it("routes a structurally invalid response to the existing load error state", async () => {
    mocks.apiGet.mockResolvedValue({
      persons: undefined,
      relationships: [],
    });

    const { result } = renderHook(() => useTreePageState("tree-1", null));

    await waitFor(() => expect(result.current.loadingData).toBe(false));

    expect(result.current.persons).toEqual([]);
    expect(result.current.capabilities).toEqual(NO_CAPABILITIES);
    expect(result.current.error).toBe("Không thể tải sơ đồ gia phả. Vui lòng thử lại.");
  });

  it("does not infer owner behavior from a role label when capabilities are omitted", async () => {
    mocks.apiGet.mockResolvedValue(treePayload("Cây cũ", { accessRole: "OWNER" }));

    const { result } = renderHook(() => useTreePageState("tree-1", null));

    await waitFor(() => expect(result.current.loadingData).toBe(false));

    expect(result.current.accessRole).toBe("OWNER");
    expect(result.current.capabilities).toEqual(NO_CAPABILITIES);
    expect(result.current.isOwner).toBe(false);
    expect(result.current.isCollaborator).toBe(false);
    expect(result.current.guidanceRole).toBe("reader");
    expect(mocks.getCollaborators).not.toHaveBeenCalled();
  });

  it("resets privileged controls while a different tree is loading", async () => {
    const readerResponse = deferred<Record<string, unknown>>();
    mocks.apiGet.mockImplementation((url: string) => url.includes("tree-owner")
      ? Promise.resolve(treePayload("Cây chủ sở hữu", {
          accessRole: "OWNER",
          capabilities: OWNER_CAPABILITIES,
        }))
      : readerResponse.promise);

    const { result, rerender } = renderHook(
      ({ treeId }) => useTreePageState(treeId, null),
      { initialProps: { treeId: "tree-owner" } },
    );
    await waitFor(() => expect(result.current.capabilities.manageTree).toBe(true));

    rerender({ treeId: "tree-reader" });

    await waitFor(() => expect(result.current.loadingData).toBe(true));
    expect(result.current.accessRole).toBe("NONE");
    expect(result.current.capabilities).toEqual(NO_CAPABILITIES);

    await act(async () => {
      readerResponse.resolve(treePayload("Cây người đọc", { accessRole: "READER" }));
      await readerResponse.promise;
    });
  });

  it("ignores a stale privileged response that resolves after the current tree", async () => {
    const ownerResponse = deferred<Record<string, unknown>>();
    const readerResponse = deferred<Record<string, unknown>>();
    mocks.apiGet.mockImplementation((url: string) => url.includes("tree-owner")
      ? ownerResponse.promise
      : readerResponse.promise);

    const { result, rerender } = renderHook(
      ({ treeId }) => useTreePageState(treeId, null),
      { initialProps: { treeId: "tree-owner" } },
    );
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledTimes(1));

    rerender({ treeId: "tree-reader" });
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledTimes(2));

    await act(async () => {
      readerResponse.resolve(treePayload("Cây người đọc", { accessRole: "READER" }));
      await readerResponse.promise;
    });
    await waitFor(() => expect(result.current.treeName).toBe("Cây người đọc"));

    await act(async () => {
      ownerResponse.resolve(treePayload("Cây chủ sở hữu", {
        accessRole: "OWNER",
        capabilities: OWNER_CAPABILITIES,
      }));
      await ownerResponse.promise;
    });

    expect(result.current.treeName).toBe("Cây người đọc");
    expect(result.current.accessRole).toBe("READER");
    expect(result.current.capabilities).toEqual(NO_CAPABILITIES);
  });
});
