import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiException } from "./errors";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  innerJoin: vi.fn(),
  needsReacceptance: vi.fn(),
}));

vi.mock("../db", () => ({ db: { select: mocks.select } }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: vi.fn() }) }));
vi.mock("./auth", () => ({ sessionService: { resolve: vi.fn() } }));
vi.mock("./consent", () => ({
  consentService: { needsReacceptance: mocks.needsReacceptance },
}));

import { AuthorizationService, capabilitiesFor } from "./authorization";

describe("collaboration roster authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.where, innerJoin: mocks.innerJoin });
    mocks.innerJoin.mockReturnValue({ where: mocks.where });
    mocks.needsReacceptance.mockResolvedValue(false);
  });

  it("allows the direct owner", async () => {
    mocks.where.mockResolvedValueOnce([{ id: "tree-1" }]).mockResolvedValueOnce([]);
    await expect(
      new AuthorizationService().requireCollaborationRosterAccess("owner", "tree-1"),
    ).resolves.toBeUndefined();
  });

  it("rejects an active contributor because collaboration management is owner-only", async () => {
    mocks.where.mockResolvedValueOnce([]);
    await expect(
      new AuthorizationService().requireCollaborationRosterAccess("member", "tree-1"),
    ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" } satisfies Partial<ApiException>);
  });

  it.each([null, "claimed-only", "public-viewer", "share-token-viewer", "unrelated"])(
    "uniformly rejects non-members: %s",
    async (userId) => {
      mocks.where.mockResolvedValue([]);
      const action = new AuthorizationService().requireCollaborationRosterAccess(userId, "hidden-tree");
      await expect(action).rejects.toMatchObject({ code: "NOT_AUTHORIZED" } satisfies Partial<ApiException>);
    },
  );
});

describe("tree capability classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.where, innerJoin: mocks.innerJoin });
    mocks.innerJoin.mockReturnValue({ where: mocks.where });
    mocks.needsReacceptance.mockResolvedValue(false);
  });

  it("classifies an active collaborator as CONTRIBUTOR rather than OWNER", async () => {
    mocks.where.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "membership" }]);

    await expect(
      new AuthorizationService().classify("member", "tree-1"),
    ).resolves.toBe("CONTRIBUTOR");
  });

  it("classifies a user linked to the target person as LINKED", async () => {
    mocks.where
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "claim" }]);

    await expect(
      new AuthorizationService().classify("relative", "tree-1", "person-1"),
    ).resolves.toBe("LINKED");
  });

  it("classifies a claimed member as LINKED at tree level", async () => {
    mocks.where
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "claim" }]);

    await expect(
      new AuthorizationService().classify("relative", "tree-1"),
    ).resolves.toBe("LINKED");
  });

  it("allows contributors to mutate content but rejects owner-only operations", async () => {
    mocks.where
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "membership" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "membership" }]);

    const service = new AuthorizationService();
    await expect(
      service.requireContentEditor("member", "tree-1"),
    ).resolves.toBeUndefined();
    await expect(service.requireOwner("member", "tree-1")).rejects.toMatchObject({
      code: "NOT_AUTHORIZED",
    } satisfies Partial<ApiException>);
  });

  it("allows only owner or linked subject to change visibility", async () => {
    mocks.where
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "membership" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "claim" }]);

    const service = new AuthorizationService();
    await expect(
      service.requireVisibilityEditor("member", "tree-1", "person-1"),
    ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" } satisfies Partial<ApiException>);
    await expect(
      service.requireVisibilityEditor("relative", "tree-1", "person-1"),
    ).resolves.toBeUndefined();
  });

  it("maps roles to server-owned UI capabilities", () => {
    expect(capabilitiesFor("OWNER")).toMatchObject({
      editContent: true,
      editRelationships: true,
      editVisibility: true,
      manageTree: true,
      manageClaim: true,
    });
    expect(capabilitiesFor("CONTRIBUTOR")).toMatchObject({
      editContent: true,
      editRelationships: true,
      editVisibility: false,
      manageTree: false,
      manageClaim: false,
    });
    expect(capabilitiesFor("LINKED")).toMatchObject({
      editContent: false,
      editRelationships: false,
      editVisibility: false,
      manageTree: false,
      manageClaim: false,
    });
    expect(capabilitiesFor("LINKED", { personScoped: true })).toMatchObject({
      editContent: true,
      editRelationships: false,
      editVisibility: true,
      manageTree: false,
      manageClaim: false,
    });
    expect(capabilitiesFor("READER")).toMatchObject({
      editContent: false,
      editRelationships: false,
      editVisibility: false,
      manageTree: false,
    });
  });
});
