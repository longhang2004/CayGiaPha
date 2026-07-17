import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireReadAccess: vi.fn(),
  classify: vi.fn(),
  linkedPersonIds: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  getProjection: vi.fn(),
  ensureSeeded: vi.fn(),
  resolveAllFrom: vi.fn(),
}));

vi.mock("@/lib/services/authorization", () => ({
  getAuthContext: mocks.auth,
  authorizationService: {
    requireReadAccess: mocks.requireReadAccess,
    classify: mocks.classify,
    linkedPersonIds: mocks.linkedPersonIds,
  },
  roleForPersonProjection: (
    treeRole: string,
    linkedIds: ReadonlySet<string>,
    personId: string,
  ) => {
    if (treeRole === "OWNER" || treeRole === "CONTRIBUTOR") return treeRole;
    if (treeRole === "NONE") return "NONE";
    return linkedIds.has(personId) ? "LINKED" : "READER";
  },
}));
vi.mock("@/lib/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/lib/services/kinship/address", () => ({
  projectionCache: { getProjection: mocks.getProjection },
  ensureKinshipTermsSeeded: mocks.ensureSeeded,
}));
vi.mock("@/lib/services/kinship/resolver", () => ({
  KinshipResolver: class {
    resolveAllFrom = mocks.resolveAllFrom;
  },
}));

import { GET } from "./route";

const ego = {
  id: "ego-1",
  treeId: "tree-1",
  displayName: "Hàng Nhựt Long",
  gender: "male",
  birthOrder: 1,
  birthYear: 1990,
  phone: null,
  email: null,
  deathStatus: false,
  deathDay: null,
  deathMonth: null,
  deathYear: null,
  deathCalendar: null,
  deathLunarLeap: null,
  adoptionStatus: null,
  visMarital: "private",
  visAdoption: "private",
  visDeath: "private",
  visName: "private",
  visBirthYear: "private",
  visPhoto: "private",
};
const relative = {
  ...ego,
  id: "relative-1",
  displayName: "Nguyễn Văn Cậu",
  birthOrder: 2,
  birthYear: 1980,
};

const canonical = {
  upCount: 2,
  downCount: 1,
  side: "MATERNAL",
  targetGender: "MALE",
  branchOrder: "ELDER",
  spouseHop: false,
  canonicalKey: () => "u2:d1:MATERNAL:MALE:ELDER:s0",
};

describe("GET viewpoint addresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "viewer-1", isAuthenticated: true, role: "user" });
    mocks.requireReadAccess.mockResolvedValue(undefined);
    mocks.linkedPersonIds.mockResolvedValue(new Set());
    mocks.getProjection.mockResolvedValue({});
    mocks.ensureSeeded.mockResolvedValue(undefined);
    mocks.resolveAllFrom.mockReturnValue(
      new Map([
        [
          relative.id,
          {
            isResolved: () => true,
            relation: canonical,
            ordinalContext: {
              sourcePersonId: relative.id,
              birthOrder: 2,
              band: "parent_sibling",
              inheritedThroughSpouse: false,
            },
          },
        ],
      ]),
    );
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.where
      .mockResolvedValueOnce([ego, relative])
      .mockResolvedValueOnce([{ id: "tree-1", region: "Nam", livingRedaction: true }])
      .mockResolvedValueOnce([
        {
          canonicalRelation: "u2:d1:MATERNAL:MALE:ELDER:s0",
          term: "cậu",
        },
      ]);
  });

  it.each(["OWNER", "CONTRIBUTOR"])(
    "returns a Southern ordinal for %s without leaking ordinal metadata",
    async (role) => {
      mocks.classify.mockResolvedValue(role);

      const response = await GET(new Request("http://localhost"), {
        params: { treeId: "tree-1", egoId: ego.id },
      });
      const body = await response.json();

      expect(body.addresses[0].resolved).toBe("cậu Ba");
      expect(JSON.stringify(body)).not.toContain("ordinalContext");
      expect(JSON.stringify(body)).not.toContain("sourcePersonId");
      expect(JSON.stringify(body)).not.toContain("birthOrder");
    },
  );

  it("shows a Linked viewer an ordinal only for their own claimed source node", async () => {
    mocks.classify.mockResolvedValue("LINKED");
    mocks.linkedPersonIds.mockResolvedValue(new Set([relative.id]));

    const response = await GET(new Request("http://localhost"), {
      params: { treeId: "tree-1", egoId: ego.id },
    });
    const body = await response.json();

    expect(body.addresses[0].resolved).toBe("cậu Ba");
  });

  it("hides an ordinal from a Linked viewer when its source node is unclaimed", async () => {
    mocks.classify.mockResolvedValue("LINKED");
    mocks.linkedPersonIds.mockResolvedValue(new Set([ego.id]));

    const response = await GET(new Request("http://localhost"), {
      params: { treeId: "tree-1", egoId: ego.id },
    });
    const body = await response.json();

    expect(body.addresses[0].resolved).toBe("cậu");
  });

  it("falls back to the base term when a Reader cannot see the source birth order", async () => {
    mocks.classify.mockResolvedValue("READER");

    const response = await GET(new Request("http://localhost"), {
      params: { treeId: "tree-1", egoId: ego.id },
    });
    const body = await response.json();

    expect(body.addresses[0].resolved).toBe("cậu");
  });
});
