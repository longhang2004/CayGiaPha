import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  classify: vi.fn(),
  linkedPersonIds: vi.fn(),
  resolveAddress: vi.fn(),
}));

vi.mock("../db", () => {
  const builder = {
    from: (...args: unknown[]) => {
      mocks.from(...args);
      return builder;
    },
    where: (...args: unknown[]) => mocks.where(...args),
  };
  return {
    db: {
      select: (...args: unknown[]) => {
        mocks.select(...args);
        return builder;
      },
    },
  };
});
vi.mock("./authorization", () => ({
  authorizationService: {
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
vi.mock("./claim", () => ({ claimService: { isClaimed: vi.fn() } }));
vi.mock("./kinship/address", () => ({
  kinshipAddressService: {
    resolveAddress: mocks.resolveAddress,
    resolveDerivedAddress: vi.fn(),
  },
}));

import { relationshipTypesForFilter, SearchService } from "./search";

const PERSON = {
  id: "person-1",
  treeId: "tree",
  displayName: "Nguyễn An",
  gender: "male",
  birthOrder: null,
  birthYear: 1980,
  phone: null,
  email: null,
  deathStatus: false,
  deathDay: null,
  deathMonth: null,
  deathYear: null,
  deathCalendar: "lunar",
  deathLunarLeap: false,
  adoptionStatus: false,
  visMarital: "private",
  visAdoption: "private",
  visDeath: "private",
  visName: "public",
  visBirthYear: "public",
  visPhoto: "private",
};

describe("SearchService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.where.mockReset();
    mocks.classify.mockResolvedValue("OWNER");
    mocks.linkedPersonIds.mockResolvedValue(new Set());
  });

  it("normalizes the bloodline filter to both primitive parent edge types", () => {
    expect(relationshipTypesForFilter("bloodline")).toEqual([
      "bloodline_father",
      "bloodline_mother",
    ]);
  });

  it("returns an explicit noMatches indication", async () => {
    mocks.where
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "tree", livingRedaction: true }])
      .mockResolvedValueOnce([]);

    await expect(new SearchService().search("tree", { nameQuery: "vắng" }, "user"))
      .resolves.toEqual({ results: [], noMatches: true });
  });

  it("accepts and projects a result on a tree at the 1,000-node boundary", async () => {
    const startedAt = performance.now();
    const people = Array.from({ length: 1000 }, (_, index) => ({
      ...PERSON,
      id: `person-${index}`,
      displayName: index === 0 ? "Nguyễn An" : `Người ${index}`,
    }));
    mocks.where
      .mockResolvedValueOnce(people)
      .mockResolvedValueOnce([{ id: "tree", livingRedaction: true }])
      .mockResolvedValueOnce(people);

    const result = await new SearchService().search("tree", { nameQuery: "Nguyễn An" }, "user");
    expect(result).toMatchObject({ noMatches: false, results: [{ personId: "person-0" }] });
    expect(performance.now() - startedAt).toBeLessThan(2000);
  });

  it("rejects search above the documented 1,000-node operating bound", async () => {
    mocks.where.mockResolvedValueOnce(Array.from({ length: 1001 }, (_, index) => ({
      ...PERSON,
      id: `person-${index}`,
    })));

    await expect(new SearchService().search("tree", {}, "user"))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "treeSize" });
  });

  it.each(["cậu", "CAU BA"])(
    "matches the base or visible full Southern kinship term: %s",
    async (addressQuery) => {
      const source = { ...PERSON, birthOrder: 2 };
      mocks.resolveAddress.mockResolvedValue({
        status: "RESOLVED",
        term: "cậu",
        relation: {},
        ordinalContext: {
          sourcePersonId: source.id,
          birthOrder: 2,
          band: "parent_sibling",
          inheritedThroughSpouse: false,
        },
      });
      mocks.where
        .mockResolvedValueOnce([{ id: "viewpoint" }])
        .mockResolvedValueOnce([source])
        .mockResolvedValueOnce([{ id: "tree", region: "Nam", livingRedaction: true }])
        .mockResolvedValueOnce([{ id: "tree", region: "Nam", livingRedaction: true }])
        .mockResolvedValueOnce([source]);

      await expect(
        new SearchService().search(
          "tree",
          { addressQuery, viewpointId: "viewpoint" },
          "user",
        ),
      ).resolves.toMatchObject({ noMatches: false, results: [{ personId: source.id }] });
    },
  );

  it("does not match a full ordinal term when the source birth order is redacted", async () => {
    const source = { ...PERSON, birthOrder: 2 };
    mocks.classify.mockResolvedValue("READER");
    mocks.resolveAddress.mockResolvedValue({
      status: "RESOLVED",
      term: "cậu",
      relation: {},
      ordinalContext: {
        sourcePersonId: source.id,
        birthOrder: 2,
        band: "parent_sibling",
        inheritedThroughSpouse: false,
      },
    });
    mocks.where
      .mockResolvedValueOnce([{ id: "viewpoint" }])
      .mockResolvedValueOnce([source])
      .mockResolvedValueOnce([{ id: "tree", region: "Nam", livingRedaction: true }])
      .mockResolvedValueOnce([{ id: "tree", region: "Nam", livingRedaction: true }])
      .mockResolvedValueOnce([]);

    await expect(
      new SearchService().search(
        "tree",
        { addressQuery: "cậu ba", viewpointId: "viewpoint" },
        "reader",
      ),
    ).resolves.toEqual({ noMatches: true, results: [] });
  });

  it("does not expose another person's ordinal through a Linked search", async () => {
    const source = { ...PERSON, birthOrder: 2 };
    mocks.classify.mockResolvedValue("LINKED");
    mocks.linkedPersonIds.mockResolvedValue(new Set(["linked-own-node"]));
    mocks.resolveAddress.mockResolvedValue({
      status: "RESOLVED",
      term: "cậu",
      relation: {},
      ordinalContext: {
        sourcePersonId: source.id,
        birthOrder: 2,
        band: "parent_sibling",
        inheritedThroughSpouse: false,
      },
    });
    mocks.where
      .mockResolvedValueOnce([{ id: "viewpoint" }])
      .mockResolvedValueOnce([source])
      .mockResolvedValueOnce([{ id: "tree", region: "Nam", livingRedaction: true }])
      .mockResolvedValueOnce([{ id: "tree", region: "Nam", livingRedaction: true }])
      .mockResolvedValueOnce([]);

    await expect(
      new SearchService().search(
        "tree",
        { addressQuery: "cậu ba", viewpointId: "viewpoint" },
        "linked-user",
      ),
    ).resolves.toEqual({ noMatches: true, results: [] });
  });
});
