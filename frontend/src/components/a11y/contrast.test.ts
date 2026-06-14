/**
 * Accessibility audit: text/background contrast (Requirement 18.3, aligned with
 * WCAG 2.1 SC 1.4.3 — ≥4.5:1 for normal text, ≥3:1 for large text / non-text).
 *
 * Approach (documented): jsdom does not compute real rendered colours, so an
 * axe-core `color-contrast` audit cannot run meaningfully here. Instead we read
 * the documented palette tokens straight from `globals.css` and verify, with a
 * WCAG relative-luminance contrast computation, that each documented text/surface
 * pairing meets its threshold. This is the robust, machine-verifiable form of the
 * requirement: it pins the actual source-of-truth colour tokens to the WCAG
 * ratios so a future palette change that breaks contrast fails the build.
 *
 * Limitation (documented in Requirement 18): full conformance also requires
 * manual review against real rendered screens and assistive technologies.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Tests run from the frontend package root; read the source-of-truth stylesheet.
const GLOBALS_CSS = readFileSync(
  resolve(process.cwd(), "src/app/globals.css"),
  "utf8",
);

/** Read a `--token: #rrggbb;` value out of the CSS source. */
function readColorToken(name: string): string {
  const match = GLOBALS_CSS.match(
    new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`),
  );
  if (!match) {
    throw new Error(`Color token --${name} not found in globals.css`);
  }
  return match[1];
}

/** Parse a 6-digit hex colour into sRGB channel values in [0, 1]. */
function hexToSrgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return [r, g, b];
}

/** WCAG relative luminance of an sRGB colour. */
function relativeLuminance(hex: string): number {
  const linear = hexToSrgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** WCAG contrast ratio between two colours (>= 1, larger is higher contrast). */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("contrast utility", () => {
  it("computes the canonical WCAG ratios for black/white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
});

describe("palette contrast meets WCAG 2.1 SC 1.4.3 (18.3)", () => {
  const bg = readColorToken("color-bg");

  it("body text on the page surface is >= 4.5:1 (normal text)", () => {
    const fg = readColorToken("color-fg");
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("muted/secondary text on the page surface is >= 4.5:1 (normal text)", () => {
    const muted = readColorToken("color-muted");
    expect(contrastRatio(muted, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("accent/link text on the page surface is >= 4.5:1 (normal text)", () => {
    const accent = readColorToken("color-accent");
    expect(contrastRatio(accent, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("UI borders against the surface are >= 3:1 (non-text contrast)", () => {
    const border = readColorToken("color-border");
    expect(contrastRatio(border, bg)).toBeGreaterThanOrEqual(3);
  });

  it("the focus indicator against the surface is >= 3:1 (non-text contrast)", () => {
    const focus = readColorToken("color-focus");
    expect(contrastRatio(focus, bg)).toBeGreaterThanOrEqual(3);
  });
});
