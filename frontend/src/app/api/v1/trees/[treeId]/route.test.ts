import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireReadAccess: vi.fn(),
  classify: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  innerJoin: vi.fn(),
  where: vi.fn(),
}));

const NONE = {
  editContent: false,
  editRelationships: false,
  editPhotos: false,
  editVisibility: false,
  manageClaim: false,
  manageTree: false,
  manageCollaboration: false,
};

vi.mock("@/lib/services/authorization", () => ({
  getAuthContext: mocks.auth,
  authorizationService: {
    requireReadAccess: mocks.requireReadAccess,
    classify: mocks.classify,
  },
  capabilitiesFor: (role: string) => role === "OWNER"
    ? Object.fromEntries(Object.keys(NONE).map((key) => [key, true]))
    : NONE,
}));

vi.mock("@/lib/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/lib/services/privacy", () => ({
  projectPerson: (person: Record<string, unknown>) => ({
    id: person.id,
    displayName: person.displayName,
    deathStatus: false,
  }),
  canViewMaritalStatus: () => true,
}));

import { GET } from "./route";

describe("GET /api/v1/trees/:treeId capability contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = {
      from: mocks.from,
      innerJoin: mocks.innerJoin,
      where: mocks.where,
    };
    mocks.select.mockReturnValue(builder);
    mocks.from.mockReturnValue(builder);
    mocks.innerJoin.mockReturnValue(builder);
    mocks.auth.mockResolvedValue({ userId: "owner-1", isAuthenticated: true, role: "user" });
    mocks.requireReadAccess.mockResolvedValue(undefined);
  });

  it("returns top-level and per-person server capabilities", async () => {
    mocks.classify.mockResolvedValue("OWNER");
    mocks.where
      .mockResolvedValueOnce([{
        id: "tree-1",
        name: "Cây họ Nguyễn",
        region: "Nam",
        sharing: "private",
        livingRedaction: true,
      }])
      .mockResolvedValueOnce([{ id: "p1", treeId: "tree-1", displayName: "An" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await GET(new Request("http://localhost/api/v1/trees/tree-1"), {
      params: { treeId: "tree-1" },
    });
    const body = await response.json();

    expect(body).toMatchObject({
      accessRole: "OWNER",
      capabilities: {
        editContent: true,
        editRelationships: true,
        manageTree: true,
      },
      persons: [{
        id: "p1",
        capabilities: {
          editContent: true,
          editRelationships: true,
          manageTree: true,
        },
      }],
    });
  });

  it("classifies an authenticated share-token reader with the same token used for access", async () => {
    mocks.classify.mockImplementation(
      async (_userId: string, _treeId: string, personId?: string | null, shareToken?: string | null) =>
        !personId && shareToken === "link-token" ? "READER" : "NONE",
    );
    mocks.where
      .mockResolvedValueOnce([{
        id: "tree-1",
        name: "Cây họ Nguyễn",
        region: "Nam",
        sharing: "link",
        livingRedaction: true,
      }])
      .mockResolvedValueOnce([{ id: "p1", treeId: "tree-1", displayName: "An" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await GET(new Request("http://localhost/api/v1/trees/tree-1", {
      headers: { "X-Share-Token": "link-token" },
    }), { params: { treeId: "tree-1" } });
    const body = await response.json();

    expect(mocks.classify).toHaveBeenCalledWith("owner-1", "tree-1", null, "link-token");
    expect(body.accessRole).toBe("READER");
    expect(body.capabilities).toEqual(NONE);
  });
});
