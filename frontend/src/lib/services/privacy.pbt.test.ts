import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isLivingPerson, projectPerson } from "./privacy";

describe("privacy projection properties", () => {
  it("keeps the 100-year living boundary and never leaks Reader metadata/private fields", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1800, max: 2026 }),
        fc.boolean(),
        fc.constantFrom("private", "public"),
        (birthYear, deathStatus, visibility) => {
          const person = {
            id: "p",
            treeId: "t",
            displayName: "Tên riêng",
            gender: "female",
            birthOrder: 1,
            birthYear,
            phone: "0900000000",
            email: "private@example.test",
            deathStatus,
            deathDay: 1,
            deathMonth: 2,
            deathYear: 2020,
            deathCalendar: "solar",
            deathLunarLeap: false,
            adoptionStatus: true,
            visMarital: visibility,
            visAdoption: visibility,
            visDeath: visibility,
            visName: visibility,
            visBirthYear: visibility,
            visPhoto: visibility,
          };
          const projected = projectPerson(person, {
            role: "READER",
            livingRedaction: true,
            currentYear: 2026,
          });

          expect(isLivingPerson(person, 2026)).toBe(
            !deathStatus && birthYear >= 1926,
          );
          expect(projected).not.toHaveProperty("phone");
          expect(projected).not.toHaveProperty("email");
          expect(projected).not.toHaveProperty("visName");
          expect(projected).not.toHaveProperty("visBirthYear");
          if (visibility === "private") {
            expect(projected).not.toHaveProperty("birthYear");
            expect(projected).not.toHaveProperty("adoptionStatus");
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
