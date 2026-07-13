import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  classify: vi.fn(),
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
  authorizationService: { classify: mocks.classify },
}));
vi.mock("./claim", () => ({ claimService: { isClaimed: vi.fn() } }));
vi.mock("./kinship/address", () => ({
  kinshipAddressService: {
    resolveAddress: vi.fn(),
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
});
