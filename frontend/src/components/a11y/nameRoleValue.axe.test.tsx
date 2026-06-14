/**
 * Accessibility audit: programmatic name / role / value (Requirement 18.5,
 * aligned with WCAG 2.1 SC 4.1.2).
 *
 * Approach: automated audit with axe-core (v4) run over rendered components and
 * forms, restricted to the WCAG 4.1.2 rule set (`wcag412` tag) so we assert
 * exactly the name/role/value thresholds the requirement targets (and not, e.g.,
 * landmark/region rules that don't apply to isolated component fragments).
 *
 * axe-core is already available in the toolchain, so no new runtime dependency
 * is required; it runs against the jsdom DOM that Testing Library renders into.
 *
 * Limitation (documented in Requirement 18): automated checks verify only the
 * machine-verifiable thresholds. Full SC 4.1.2 conformance additionally requires
 * manual screen-reader testing and expert accessibility review.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import type { ReactElement } from "react";

import { TextSizeProvider } from "./TextSizeProvider";
import { TextSizeControl } from "./TextSizeControl";
import { Button } from "@/components/Button";
import { IdentifierForm } from "@/components/auth/IdentifierForm";
import { OtpForm } from "@/components/auth/OtpForm";
import { PersonForm } from "@/components/person/PersonForm";

/**
 * Render `ui`, run an axe-core audit limited to the WCAG 4.1.2 (name/role/value)
 * rule set over the rendered subtree, and return any violations found.
 */
async function nameRoleValueViolations(
  ui: ReactElement,
): Promise<axe.Result[]> {
  const { container } = render(ui);
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag412"] },
    // jsdom does not lay out / paint, so disable the iframe/preload machinery
    // that expects a real browser; the DOM-attribute rules we care about run
    // entirely on the rendered markup.
    elementRef: false,
  });
  return results.violations;
}

/** Build a readable message listing any violations for assertion output. */
function describeViolations(violations: axe.Result[]): string {
  return violations
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`)
    .join("\n");
}

describe("name/role/value audit (18.5, WCAG 4.1.2)", () => {
  it("Button exposes a programmatic name and button role", async () => {
    const violations = await nameRoleValueViolations(<Button>Lưu</Button>);
    expect(describeViolations(violations)).toBe("");
  });

  it("TextSizeControl controls have programmatic names, roles, and values", async () => {
    const violations = await nameRoleValueViolations(
      <TextSizeProvider>
        <TextSizeControl />
      </TextSizeProvider>,
    );
    expect(describeViolations(violations)).toBe("");
  });

  it("IdentifierForm controls are programmatically labelled", async () => {
    const violations = await nameRoleValueViolations(
      <IdentifierForm
        heading="Đăng ký"
        description="Nhập số điện thoại hoặc email."
        submitLabel="Gửi mã"
        onSubmit={async () => {}}
      />,
    );
    expect(describeViolations(violations)).toBe("");
  });

  it("OtpForm controls are programmatically labelled", async () => {
    const violations = await nameRoleValueViolations(
      <OtpForm
        heading="Xác thực"
        identifier="user@example.com"
        submitLabel="Xác nhận"
        onSubmit={async () => {}}
        onBack={() => {}}
      />,
    );
    expect(describeViolations(violations)).toBe("");
  });

  it("PersonForm controls (inputs, radios, checkbox, toggles) are labelled", async () => {
    const violations = await nameRoleValueViolations(
      <PersonForm mode="create" treeId="tree-1" />,
    );
    expect(describeViolations(violations)).toBe("");
  });
});
