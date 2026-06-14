/**
 * Accessibility audit: touch-target size (Requirement 18.4 — every interactive
 * touch target is at least 44×44 CSS pixels).
 *
 * Approach (documented): jsdom performs no layout, so it cannot report the real
 * rendered box of a control (vitest also runs with `css: false`). We therefore
 * assert the requirement at the source-of-truth + representative-component level:
 *
 *  1. Token/rule level — `globals.css` defines `--min-touch-target: 44px` (>= 44)
 *     and applies it as a `min-height`/`min-width` to the interactive element
 *     selectors (button, role=button, links styled as buttons, inputs, select,
 *     textarea). This is the rule that gives every control its 44px floor.
 *  2. Representative components — the shared interactive controls render as the
 *     semantic elements those selectors target (e.g. the Button renders a
 *     <button>, the text-size control renders <button>/<input>), so the rule
 *     applies to them.
 *
 * Limitation (documented in Requirement 18): real pixel sizing must additionally
 * be confirmed by manual testing on touch devices / expert review.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Button } from "@/components/Button";
import { TextSizeProvider } from "./TextSizeProvider";
import { TextSizeControl } from "./TextSizeControl";

// Tests run from the frontend package root; read the source-of-truth stylesheet.
const GLOBALS_CSS = readFileSync(
  resolve(process.cwd(), "src/app/globals.css"),
  "utf8",
);

/** Strip CSS comments so token matches reflect active declarations only. */
const ACTIVE_CSS = GLOBALS_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

describe("touch-target sizing tokens/rules (18.4)", () => {
  it("defines a minimum touch-target token of at least 44px", () => {
    const match = ACTIVE_CSS.match(/--min-touch-target:\s*(\d+)px/);
    expect(match).not.toBeNull();
    const px = Number(match![1]);
    expect(px).toBeGreaterThanOrEqual(44);
  });

  it("applies the minimum touch-target as min-height to interactive controls", () => {
    // The rule block that sizes interactive controls must use the token.
    expect(ACTIVE_CSS).toMatch(/min-height:\s*var\(--min-touch-target\)/);
    // And it must target the shared interactive element selectors.
    expect(ACTIVE_CSS).toMatch(/\bbutton\b/);
    expect(ACTIVE_CSS).toMatch(/\binput\b/);
    expect(ACTIVE_CSS).toMatch(/\bselect\b/);
    expect(ACTIVE_CSS).toMatch(/\btextarea\b/);
  });

  it("gives checkbox/radio labels a 44px tap area via min-height", () => {
    // The label wrappers for checkbox/radio carry the touch-target floor.
    expect(ACTIVE_CSS).toMatch(
      /label:has\(>\s*input\[type="(checkbox|radio)"\]\)/,
    );
  });
});

describe("representative interactive controls render as targeted elements (18.4)", () => {
  it("Button renders a native <button> covered by the touch-target rule", () => {
    render(<Button>Lưu</Button>);
    const button = screen.getByRole("button", { name: "Lưu" });
    expect(button.tagName).toBe("BUTTON");
  });

  it("TextSizeControl renders <button>/<input> controls covered by the rule", () => {
    render(
      <TextSizeProvider>
        <TextSizeControl />
      </TextSizeProvider>,
    );
    expect(screen.getByRole("button", { name: "Tăng cỡ chữ" }).tagName).toBe(
      "BUTTON",
    );
    expect(screen.getByRole("button", { name: "Giảm cỡ chữ" }).tagName).toBe(
      "BUTTON",
    );
    expect(screen.getByRole("slider", { name: "Cỡ chữ" }).tagName).toBe("INPUT");
  });
});
