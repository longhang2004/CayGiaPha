/**
 * Accessibility audit: keyboard reachability (Requirement 18.6 — keyboard-only
 * navigation reaches every interactive control, aligned with WCAG 2.1 SC 2.1.1).
 *
 * Approach: for representative forms/screens, drive sequential Tab traversal
 * with userEvent and assert that every interactive control receives focus, and
 * that no control opts out of the natural tab order or uses a positive tabindex
 * (which would break the document order and harm reachability/predictability).
 *
 * Limitation (documented in Requirement 18): full keyboard operability (e.g.
 * complex widget interaction patterns, focus-visible rendering) must also be
 * confirmed by manual testing and expert review.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { IdentifierForm } from "@/components/auth/IdentifierForm";
import { OtpForm } from "@/components/auth/OtpForm";

/** Assert no element in the subtree uses a positive tabindex. */
function expectNoPositiveTabindex(container: HTMLElement): void {
  const withTabindex = Array.from(
    container.querySelectorAll<HTMLElement>("[tabindex]"),
  );
  for (const el of withTabindex) {
    const value = Number(el.getAttribute("tabindex"));
    expect(value).toBeLessThanOrEqual(0);
  }
}

/**
 * Tab forward through the document and return the ordered list of focused
 * elements (one Tab press per expected control).
 */
async function tabThrough(
  user: ReturnType<typeof userEvent.setup>,
  steps: number,
): Promise<Element[]> {
  const visited: Element[] = [];
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await user.tab();
    if (document.activeElement && document.activeElement !== document.body) {
      visited.push(document.activeElement);
    }
  }
  return visited;
}

describe("keyboard reachability (18.6, WCAG 2.1.1)", () => {
  it("Tab reaches every control of IdentifierForm in document order", async () => {
    const user = userEvent.setup();
    const { container, getByLabelText, getByRole } = render(
      <IdentifierForm
        heading="Đăng nhập"
        description="Nhập số điện thoại hoặc email."
        submitLabel="Gửi mã"
        onSubmit={async () => {}}
      />,
    );

    const input = getByLabelText("Số điện thoại hoặc email");
    const submit = getByRole("button", { name: "Gửi mã" });

    const visited = await tabThrough(user, 2);
    expect(visited).toContain(input);
    expect(visited).toContain(submit);
    expectNoPositiveTabindex(container);
  });

  it("Tab reaches every control of OtpForm (input + both buttons)", async () => {
    const user = userEvent.setup();
    const { container, getByLabelText, getByRole } = render(
      <OtpForm
        heading="Xác thực"
        identifier="user@example.com"
        submitLabel="Xác nhận"
        onSubmit={async () => {}}
        onBack={() => {}}
      />,
    );

    const codeInput = getByLabelText("Mã xác thực");
    const confirm = getByRole("button", { name: "Xác nhận" });
    const back = getByRole("button", { name: "Quay lại" });

    const visited = await tabThrough(user, 3);
    expect(visited).toContain(codeInput);
    expect(visited).toContain(confirm);
    expect(visited).toContain(back);
    expectNoPositiveTabindex(container);
  });

  it("focuses controls one-by-one starting from the document body", async () => {
    const user = userEvent.setup();
    const { getByLabelText } = render(
      <IdentifierForm
        heading="Đăng nhập"
        description="Nhập số điện thoại hoặc email."
        submitLabel="Gửi mã"
        onSubmit={async () => {}}
      />,
    );

    expect(document.body).toBe(document.activeElement);
    await user.tab();
    expect(getByLabelText("Số điện thoại hoặc email")).toBe(
      document.activeElement,
    );
  });
});
