import { describe, expect, it } from "vitest";
import { ApiException } from "@/lib/services/errors";
import { normalizeAndValidateDisplayName } from "./displayName";

describe("normalizeAndValidateDisplayName", () => {
  it("trims and collapses Unicode whitespace while preserving casing and diacritics", () => {
    expect(normalizeAndValidateDisplayName("  Nguyễn\u00a0  Văn   An  ")).toBe("Nguyễn Văn An");
  });

  it("counts Unicode code points rather than UTF-16 code units", () => {
    const name = "😀".repeat(100);
    expect(normalizeAndValidateDisplayName(name)).toBe(name);
    expect(() => normalizeAndValidateDisplayName(`${name}😀`)).toThrow(ApiException);
  });

  it.each([undefined, null, 123, "", "   "])("rejects missing or blank input: %p", (value) => {
    expectDisplayNameError(value);
  });

  it.each(["An\nNguyễn", "An\tNguyễn", "An\u0000Nguyễn", "An\u0085Nguyễn"])(
    "rejects control characters before whitespace normalization",
    (value) => expectDisplayNameError(value),
  );
});

function expectDisplayNameError(value: unknown) {
  try {
    normalizeAndValidateDisplayName(value);
    throw new Error("Expected validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).field).toBe("displayName");
  }
}
