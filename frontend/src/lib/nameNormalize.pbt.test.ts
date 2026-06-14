import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { containsNormalized, normalizeName } from "./nameNormalize";

/**
 * Feature: vietnamese-family-tree, Property 23
 *
 * Property 23: Name search is normalized-substring exact.
 *
 * Validates: Requirements 16.1
 *
 * For any query and set of person names, name search returns all and only the
 * persons whose case-folded, diacritic-stripped display name contains the
 * case-folded, diacritic-stripped query as a substring. Here we validate the
 * shared TS normalizer (`normalizeName` / `containsNormalized`) used by the
 * search UI, cross-checking it against an INDEPENDENT oracle implementation
 * that uses an explicit precomposed-VN-character → base-letter table rather
 * than Unicode NFD decomposition. Mirrors the backend NameNormalizer property.
 */

// --- Independent normalization oracle ---------------------------------------
// A second, deliberately different implementation of the case-fold +
// diacritic-strip + đ→d transformation, built from an explicit precomposed
// character → base-letter map (no NFD). Equality between this oracle and
// normalizeName is asserted below, so the two implementations cross-check.

const PRECOMPOSED_TO_BASE: Record<string, string> = {};
function register(base: string, variants: string): void {
  for (const ch of variants) {
    PRECOMPOSED_TO_BASE[ch] = base;
  }
}
register("a", "àáảãạâầấẩẫậăằắẳẵặ");
register("e", "èéẻẽẹêềếểễệ");
register("i", "ìíỉĩị");
register("o", "òóỏõọôồốổỗộơờớởỡợ");
register("u", "ùúủũụưừứửữự");
register("y", "ỳýỷỹỵ");
register("d", "đ");

/** Lowercase, then map every precomposed VN letter to its base ASCII letter. */
function independentNormalize(input: string | null | undefined): string {
  if (input == null) {
    return "";
  }
  const lower = input.toLowerCase();
  let out = "";
  for (const ch of lower) {
    out += PRECOMPOSED_TO_BASE[ch] ?? ch;
  }
  return out;
}

// --- Re-decoration table: base letter → diacritic/case variants -------------
// Each variant MUST normalize back to its base letter. Used to build queries
// that are re-decorated normalized substrings of a name.
const BASE_TO_VARIANTS: Record<string, string[]> = {
  a: ["a", "A", "á", "à", "ả", "ã", "ạ", "â", "ấ", "ầ", "ă", "ằ", "Á", "Â", "Ă"],
  e: ["e", "E", "é", "è", "ẻ", "ẽ", "ẹ", "ê", "ế", "ề", "É", "Ê"],
  i: ["i", "I", "í", "ì", "ỉ", "ĩ", "ị", "Í", "Ì"],
  o: ["o", "O", "ó", "ò", "ỏ", "õ", "ọ", "ô", "ố", "ồ", "ơ", "ớ", "ờ", "Ó", "Ô", "Ơ"],
  u: ["u", "U", "ú", "ù", "ủ", "ũ", "ụ", "ư", "ứ", "ừ", "Ú", "Ư"],
  y: ["y", "Y", "ý", "ỳ", "ỷ", "ỹ", "ỵ", "Ý"],
  d: ["d", "D", "đ", "Đ"],
  " ": [" "],
};

/** Pool of Vietnamese-flavored characters for generated strings. */
const POOL =
  "aAáàảãạâấầẩẫậăắằẳ" +
  "eEéèẻẽẹêếềể" +
  "iIíìỉĩị" +
  "oOóòỏõọôốồ ơớờ" +
  "uUúùủũụưứừ" +
  "yYýỳ" +
  "dDđĐ" +
  "bchnmt " + // plain ASCII consonants + space (pass-through chars)
  "XZ"; // ASCII letters with no diacritic mapping

const poolString = (minLength: number, maxLength: number) =>
  fc.stringOf(fc.constantFrom(...POOL.split("")), { minLength, maxLength });

describe("Feature: vietnamese-family-tree, Property 23 — normalizeName / containsNormalized", () => {
  it("normalizeName equals the independent precomposed-table oracle", () => {
    // Feature: vietnamese-family-tree, Property 23
    fc.assert(
      fc.property(poolString(0, 30), (text) => {
        expect(normalizeName(text)).toBe(independentNormalize(text));
      }),
      { numRuns: 300 },
    );
  });

  it("containsNormalized matches the oracle's normalized-substring includes", () => {
    // Feature: vietnamese-family-tree, Property 23
    fc.assert(
      fc.property(poolString(0, 25), poolString(0, 8), (name, query) => {
        const expected = independentNormalize(name).includes(
          independentNormalize(query),
        );
        expect(containsNormalized(name, query)).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });

  it("a re-decorated normalized substring of a name is always reported as contained", () => {
    // Feature: vietnamese-family-tree, Property 23
    fc.assert(
      fc.property(
        poolString(1, 25),
        fc.nat(),
        fc.nat(),
        fc.array(fc.nat(), { minLength: 0, maxLength: 30 }),
        (name, startSeed, lenSeed, variantSeeds) => {
          const norm = normalizeName(name);
          const n = norm.length;
          if (n === 0) {
            // Empty normalized name: the empty query is trivially a substring.
            expect(containsNormalized(name, "")).toBe(true);
            return;
          }
          const start = startSeed % n;
          const len = (lenSeed % (n - start)) + 1; // 1..(n-start)
          const slice = norm.slice(start, start + len);

          // Re-decorate each base char with a diacritic/case variant that
          // normalizes back to the same base letter.
          let query = "";
          for (let i = 0; i < slice.length; i++) {
            const base = slice[i];
            const variants = BASE_TO_VARIANTS[base] ?? [base];
            const seed = variantSeeds[i % Math.max(variantSeeds.length, 1)] ?? 0;
            query += variants[seed % variants.length];
          }

          // The query normalizes back to a substring of the name, so it must
          // be reported as contained, and the oracle must agree.
          expect(normalizeName(query)).toBe(slice);
          expect(containsNormalized(name, query)).toBe(true);
          expect(independentNormalize(name).includes(independentNormalize(query))).toBe(
            true,
          );
        },
      ),
      { numRuns: 300 },
    );
  });
});
