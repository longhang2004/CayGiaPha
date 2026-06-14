import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { buildApiUrlForTest } from "./testSupport";

/**
 * Scaffolding-level property test that confirms fast-check is wired into the
 * test scope (the property generators run ≥100 cases). Domain properties
 * (e.g. Property 23 diacritic normalization in task 10.5) will follow this
 * same pattern.
 */
describe("fast-check is available in the test scope", () => {
  it("api URLs are always rooted at the /api/v1 prefix for any path", () => {
    fc.assert(
      fc.property(fc.string(), (path) => {
        const url = buildApiUrlForTest(path);
        expect(url.startsWith("/api/v1")).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
