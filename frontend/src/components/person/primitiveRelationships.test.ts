import { describe, expect, it } from "vitest";
import {
  mapExistingPersonRelationship,
  mapNewPersonRelationship,
} from "./primitiveRelationships";

const MALE_ANCHOR = { id: "anchor", gender: "male" as const };
const FEMALE_ANCHOR = { id: "anchor", gender: "female" as const };

describe("mapNewPersonRelationship", () => {
  it.each([
    ["father", "bloodline_father", "source", "male"],
    ["mother", "bloodline_mother", "source", "female"],
    ["son", "bloodline_father", "target", "male"],
    ["daughter", "bloodline_father", "target", "female"],
    ["wife", "marriage", "target", "female"],
    ["husband", "marriage", "target", "male"],
  ] as const)(
    "maps %s to the atomic relative payload",
    (intent, type, newPersonPosition, gender) => {
      expect(mapNewPersonRelationship(intent, MALE_ANCHOR)).toEqual({
        type,
        existingPersonId: "anchor",
        newPersonPosition,
        gender,
        ...(type === "marriage" ? { maritalStatus: "married" } : {}),
      });
    },
  );

  it("uses the mother's edge type when a woman adds a child", () => {
    expect(mapNewPersonRelationship("daughter", FEMALE_ANCHOR)).toMatchObject({
      type: "bloodline_mother",
      newPersonPosition: "target",
      gender: "female",
    });
  });
});

describe("mapExistingPersonRelationship", () => {
  it.each([
    ["father", "bloodline_father", "other", "anchor", "male"],
    ["mother", "bloodline_mother", "other", "anchor", "female"],
    ["son", "bloodline_father", "anchor", "other", "male"],
    ["daughter", "bloodline_father", "anchor", "other", "female"],
    ["wife", "marriage", "anchor", "other", "female"],
    ["husband", "marriage", "anchor", "other", "male"],
  ] as const)(
    "maps %s with the selected person fixed as the anchor",
    (intent, type, sourceId, targetId, expectedGender) => {
      expect(
        mapExistingPersonRelationship(intent, MALE_ANCHOR, { id: "other" }),
      ).toEqual({
        type,
        sourceId,
        targetId,
        expectedGender,
        ...(type === "marriage" ? { maritalStatus: "married" } : {}),
      });
    },
  );

  it("uses the mother's edge type when the selected woman is the parent", () => {
    expect(
      mapExistingPersonRelationship("son", FEMALE_ANCHOR, { id: "other" }),
    ).toMatchObject({
      type: "bloodline_mother",
      sourceId: "anchor",
      targetId: "other",
    });
  });
});
