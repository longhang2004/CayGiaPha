import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatKinshipDisplayTerm } from "./ordinal";
import type { KinshipOrdinalContext } from "./resolver";

const context = (
  birthOrder: number,
  inheritedThroughSpouse = false
): KinshipOrdinalContext => ({
  sourcePersonId: "relative-1",
  birthOrder,
  band: "parent_sibling",
  inheritedThroughSpouse,
});

describe("formatKinshipDisplayTerm", () => {
  it.each([
    ["anh", 1, "anh Hai"],
    ["cậu", 2, "cậu Ba"],
    ["dì", 3, "dì Tư"],
    ["mợ", 2, "mợ Ba"],
    ["chú", 9, "chú Mười"],
    ["cô", 13, "cô Mười Tư"],
    ["bác", 99, "bác Một Trăm"],
  ])("formats Southern ordinal %s/%i", (baseTerm, birthOrder, expected) => {
    expect(
      formatKinshipDisplayTerm({
        baseTerm,
        region: "Nam",
        ordinalContext: context(birthOrder, baseTerm === "mợ"),
        canExposeOrdinal: true,
      })
    ).toBe(expected);
  });

  it.each([
    [14, "anh Mười Lăm"],
    [19, "anh Hai Mươi"],
    [20, "anh Hai Mươi Mốt"],
    [24, "anh Hai Mươi Lăm"],
    [98, "anh Chín Mươi Chín"],
    [99, "anh Một Trăm"],
  ])("formats calling-number boundary for birth order %i", (birthOrder, expected) => {
    expect(
      formatKinshipDisplayTerm({
        baseTerm: "anh",
        region: "Nam",
        ordinalContext: context(birthOrder),
        canExposeOrdinal: true,
      }),
    ).toBe(expected);
  });

  it.each(["Bac", "Trung"])("does not append an ordinal for %s", (region) => {
    expect(
      formatKinshipDisplayTerm({
        baseTerm: "cậu",
        region,
        ordinalContext: context(2),
        canExposeOrdinal: true,
      })
    ).toBe("cậu");
  });

  it("falls back to the canonical display term when the ordinal is private or absent", () => {
    expect(
      formatKinshipDisplayTerm({
        baseTerm: "cậu",
        region: "Nam",
        ordinalContext: context(2),
        canExposeOrdinal: false,
      })
    ).toBe("cậu");
    expect(
      formatKinshipDisplayTerm({
        baseTerm: "cậu",
        region: "Nam",
        ordinalContext: null,
        canExposeOrdinal: true,
      })
    ).toBe("cậu");
  });

  it("formats every supported birth order without inferring Út", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99 }), (birthOrder) => {
        const display = formatKinshipDisplayTerm({
          baseTerm: "anh",
          region: "Nam",
          ordinalContext: context(birthOrder),
          canExposeOrdinal: true,
        });
        expect(display).toMatch(/^anh\s\S/);
        expect(display.toLocaleLowerCase("vi")).not.toContain("út");
      })
    );
  });
});
