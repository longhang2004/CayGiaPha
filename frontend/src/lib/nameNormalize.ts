/**
 * Shared Vietnamese name normalization used by the search UI.
 *
 * Mirrors the backend `NameNormalizer` (task 9.1) so that name search agrees
 * across the frontend and backend tiers: case-fold, strip Vietnamese
 * diacritics, and map đ/Đ → d.
 *
 * Validates: Requirements 16.1 (case-insensitive, diacritic-insensitive
 * substring name search). See design "Property 23: Name search is
 * normalized-substring exact".
 */

/** Combining diacritical marks range (covers the Vietnamese tone/vowel marks). */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * Normalize a name for diacritic-insensitive, case-insensitive comparison.
 *
 * Steps:
 *  1. Lowercase.
 *  2. Decompose to NFD so precomposed accented letters split into base + mark.
 *  3. Remove combining marks (\u0300-\u036f).
 *  4. Map đ/Đ → d (đ has no NFD decomposition, so it is handled explicitly).
 *
 * A null/undefined input normalizes to the empty string.
 */
export function normalizeName(s: string | null | undefined): string {
  if (s == null) {
    return "";
  }
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    // đ/Đ do not decompose under NFD; map the stroked d to a plain d. The
    // input is already lowercased, so only the lowercase form remains, but we
    // include the uppercase form defensively.
    .replace(/[đĐ]/g, "d");
}

/**
 * True when `name`'s normalized form contains `query`'s normalized form as a
 * substring. This is the substring-match semantics behind name search.
 */
export function containsNormalized(
  name: string | null | undefined,
  query: string | null | undefined,
): boolean {
  return normalizeName(name).includes(normalizeName(query));
}
