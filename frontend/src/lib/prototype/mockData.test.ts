import { describe, expect, it } from "vitest";
import { MOCK_PERSONS, MOCK_RELATIONSHIPS } from "./mockData";

describe("prototype family fixture invariants", () => {
  it("uses unique person and relationship IDs", () => {
    const personIds = MOCK_PERSONS.map((person) => person.id);
    const relationshipIds = MOCK_RELATIONSHIPS.map((relationship) => relationship.id);

    expect(new Set(personIds).size).toBe(personIds.length);
    expect(new Set(relationshipIds).size).toBe(relationshipIds.length);
  });

  it("references only people present in the fixture", () => {
    const personIds = new Set(MOCK_PERSONS.map((person) => person.id));

    for (const relationship of MOCK_RELATIONSHIPS) {
      expect(personIds.has(relationship.sourceId), relationship.id).toBe(true);
      expect(personIds.has(relationship.targetId), relationship.id).toBe(true);
    }
  });

  it("keeps explicit Southern sibling orders for the ordinal demo", () => {
    const people = new Map(MOCK_PERSONS.map((person) => [person.id, person]));

    expect(people.get("anh-ruot")?.birthOrder).toBe(1);
    expect(people.get("ego")?.birthOrder).toBe(2);
    expect(people.get("em")?.birthOrder).toBe(3);
    expect(people.get("ma")?.birthOrder).toBe(1);
    expect(people.get("cau")?.birthOrder).toBe(2);
    expect(people.get("di")?.birthOrder).toBe(3);
  });
});
