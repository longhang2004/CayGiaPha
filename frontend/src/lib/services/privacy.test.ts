import { describe, expect, it } from "vitest";
import {
  REDACTED_PERSON_NAME,
  canExposeKinshipOrdinal,
  canViewGovernedField,
  isLivingPerson,
  projectPerson,
} from "./privacy";

const basePerson = {
  id: "p1",
  treeId: "t1",
  displayName: "Nguyễn Văn An",
  gender: "male",
  birthOrder: 2,
  birthYear: 1926,
  phone: "0987654321",
  email: "an@example.test",
  deathStatus: false,
  deathDay: null,
  deathMonth: null,
  deathYear: null,
  deathCalendar: "lunar",
  deathLunarLeap: false,
  adoptionStatus: true,
  visMarital: "private",
  visAdoption: "private",
  visDeath: "private",
  visName: "private",
  visBirthYear: "private",
  visPhoto: "private",
};

describe("privacy projector", () => {
  it("treats a person born exactly 100 years ago as living", () => {
    expect(isLivingPerson(basePerson, 2026)).toBe(true);
    expect(isLivingPerson({ ...basePerson, birthYear: 1925 }, 2026)).toBe(false);
    expect(isLivingPerson({ ...basePerson, birthYear: null }, 2026)).toBe(true);
    expect(isLivingPerson({ ...basePerson, deathStatus: true }, 2026)).toBe(false);
  });

  it("gives Owner and Contributor trusted full reads", () => {
    for (const role of ["OWNER", "CONTRIBUTOR"] as const) {
      expect(projectPerson(basePerson, { role, livingRedaction: true, currentYear: 2026 }))
        .toMatchObject({
          displayName: "Nguyễn Văn An",
          birthOrder: 2,
          birthYear: 1926,
          phone: "0987654321",
          email: "an@example.test",
          adoptionStatus: true,
          visName: "private",
        });
    }
  });

  it("omits private fields and visibility metadata from a Reader", () => {
    const projected = projectPerson(basePerson, {
      role: "READER",
      livingRedaction: true,
      currentYear: 2026,
    });

    expect(projected.displayName).toBe(REDACTED_PERSON_NAME);
    expect(projected).not.toHaveProperty("birthYear");
    expect(projected).not.toHaveProperty("birthOrder");
    expect(projected).not.toHaveProperty("phone");
    expect(projected).not.toHaveProperty("email");
    expect(projected).not.toHaveProperty("adoptionStatus");
    expect(projected).not.toHaveProperty("visName");
    expect(projected).not.toHaveProperty("visDeath");
  });

  it("honors public property exceptions while living redaction is enabled", () => {
    const projected = projectPerson(
      {
        ...basePerson,
        visName: "public",
        visBirthYear: "public",
        visDeath: "public",
      },
      { role: "READER", livingRedaction: true, currentYear: 2026 },
    );

    expect(projected.displayName).toBe("Nguyễn Văn An");
    expect(projected.birthYear).toBe(1926);
    expect(projected.deathStatus).toBe(false);
    expect(projected).not.toHaveProperty("birthOrder");
  });

  it("treats Linked as trusted only when classification is for their own node", () => {
    expect(canViewGovernedField("LINKED", "private")).toBe(true);
    expect(canViewGovernedField("READER", "private")).toBe(false);
  });

  it("exposes kinship ordinals only when birth order survives projection", () => {
    for (const role of ["OWNER", "CONTRIBUTOR", "LINKED"] as const) {
      expect(
        canExposeKinshipOrdinal(basePerson, {
          role,
          livingRedaction: true,
          currentYear: 2026,
        }),
      ).toBe(true);
    }

    expect(
      canExposeKinshipOrdinal(basePerson, {
        role: "READER",
        livingRedaction: true,
        currentYear: 2026,
      }),
    ).toBe(false);
    expect(
      canExposeKinshipOrdinal(
        { ...basePerson, birthYear: 1925 },
        { role: "READER", livingRedaction: true, currentYear: 2026 },
      ),
    ).toBe(true);
  });
});
