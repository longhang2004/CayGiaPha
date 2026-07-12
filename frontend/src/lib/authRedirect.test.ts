import { describe, expect, it } from "vitest";
import { buildAuthHref, safeInternalRedirect } from "./authRedirect";

describe("auth redirect helpers", () => {
  it("accepts internal paths and rejects absolute or protocol-relative redirects", () => {
    expect(safeInternalRedirect("/invitation/abc?tab=1", "/tree")).toBe("/invitation/abc?tab=1");
    expect(safeInternalRedirect("https://evil.example", "/tree")).toBe("/tree");
    expect(safeInternalRedirect("//evil.example", "/tree")).toBe("/tree");
  });

  it("preserves redirect and reason when switching auth pages", () => {
    expect(buildAuthHref("/signup", "/invitation/abc", "invitation")).toBe(
      "/signup?redirect=%2Finvitation%2Fabc&reason=invitation",
    );
  });
});
