import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
}));

vi.mock("../db", () => {
  const builder = {
    values: (...args: unknown[]) => {
      mocks.values(...args);
      return builder;
    },
    returning: (...args: unknown[]) => mocks.returning(...args),
  };
  const selectBuilder = {
    from: (...args: unknown[]) => {
      mocks.from(...args);
      return selectBuilder;
    },
    where: (...args: unknown[]) => mocks.where(...args),
  };
  const updateBuilder = {
    set: (...args: unknown[]) => {
      mocks.set(...args);
      return updateBuilder;
    },
    where: (...args: unknown[]) => {
      mocks.where(...args);
      return updateBuilder;
    },
    returning: (...args: unknown[]) => mocks.returning(...args),
  };
  return {
    db: {
      insert: (...args: unknown[]) => {
        mocks.insert(...args);
        return builder;
      },
      select: (...args: unknown[]) => {
        mocks.select(...args);
        return selectBuilder;
      },
      update: (...args: unknown[]) => {
        mocks.update(...args);
        return updateBuilder;
      },
    },
  };
});

import { PersonService } from "./person";

describe("PersonService creation validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.returning.mockResolvedValue([{ id: "person-1" }]);
    mocks.where.mockReset();
  });

  it("rejects fractional integer-domain fields before insertion", async () => {
    await expect(new PersonService().create({
      treeId: "tree",
      displayName: "Người mới",
      gender: "male",
      birthOrder: 1.5,
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "birthOrder" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects a lunar leap flag on a solar date", async () => {
    await expect(new PersonService().create({
      treeId: "tree",
      displayName: "Người mới",
      gender: "female",
      deathStatus: true,
      deathDay: 1,
      deathMonth: 2,
      deathYear: 2020,
      deathCalendar: "solar",
      deathLunarLeap: true,
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "deathLunarLeap" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("persists all validated death date and calendar fields", async () => {
    await new PersonService().create({
      treeId: "tree",
      displayName: "Người mới",
      gender: "female",
      deathStatus: true,
      deathDay: 15,
      deathMonth: 7,
      deathYear: 2020,
      deathCalendar: "lunar",
      deathLunarLeap: true,
    });

    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      deathStatus: true,
      deathDay: 15,
      deathMonth: 7,
      deathYear: 2020,
      deathCalendar: "lunar",
      deathLunarLeap: true,
    }));
  });

  it("clears stored death details when death status is explicitly false", async () => {
    mocks.where.mockResolvedValueOnce([{
      id: "person-1",
      treeId: "tree",
      displayName: "Người mới",
      gender: "female",
      birthOrder: null,
      birthYear: 1980,
      phone: null,
      email: null,
      deathStatus: true,
      deathDay: 15,
      deathMonth: 7,
      deathYear: 2020,
      deathCalendar: "lunar",
      deathLunarLeap: true,
    }]);
    mocks.returning.mockResolvedValueOnce([{ id: "person-1", deathStatus: false }]);

    await new PersonService().edit("tree", "person-1", { deathStatus: false });

    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({
      deathStatus: false,
      deathDay: null,
      deathMonth: null,
      deathYear: null,
      deathCalendar: "lunar",
      deathLunarLeap: false,
    }));
  });
});
