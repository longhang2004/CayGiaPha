import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CGPCheckbox } from "./Checkbox";

const FORM_SCSS = readFileSync(
  resolve(process.cwd(), "src/styles/_04_forms_buttons.scss"),
  "utf8",
);

describe("CGPCheckbox", () => {
  it("owns label, description, error, required, and invalid association", () => {
    render(
      <CGPCheckbox
        description="Bắt buộc để tạo tài khoản."
        errorMessage="Bạn cần đồng ý."
        isRequired
        isInvalid
      >
        Tôi đồng ý với điều khoản
      </CGPCheckbox>,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Tôi đồng ý với điều khoản",
    });
    expect(checkbox).toBeRequired();
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox).toHaveAccessibleDescription(
      "Bắt buộc để tạo tài khoản. Bạn cần đồng ý.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Bạn cần đồng ý.");
  });

  it("supports controlled checked state", async () => {
    const user = userEvent.setup();
    function ControlledCheckbox() {
      const [checked, setChecked] = useState(false);
      return (
        <CGPCheckbox isSelected={checked} onChange={setChecked}>
          Cho phép thông báo
        </CGPCheckbox>
      );
    }

    render(<ControlledCheckbox />);
    const checkbox = screen.getByRole("checkbox", {
      name: "Cho phép thông báo",
    });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(checkbox.closest(".cgp-checkbox")).toHaveClass(
      "cgp-checkbox--selected",
    );
  });
});

describe("CGP checkbox styles", () => {
  it("owns box, focus, selected, invalid, and disabled selectors", () => {
    expect(FORM_SCSS).toMatch(/\.cgp-checkbox\s*\{/);
    expect(FORM_SCSS).toMatch(/\.cgp-checkbox--focus-visible/);
    expect(FORM_SCSS).toMatch(/\.cgp-checkbox--selected/);
    expect(FORM_SCSS).toMatch(/\.cgp-checkbox--invalid/);
    expect(FORM_SCSS).toMatch(/\.cgp-checkbox--disabled/);
    expect(FORM_SCSS).toMatch(/\.cgp-checkbox__box/);
  });
});
