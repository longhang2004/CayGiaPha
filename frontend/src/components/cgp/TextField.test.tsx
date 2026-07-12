import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CGPPasswordField, CGPTextField } from "./TextField";

const FORM_SCSS = readFileSync(
  resolve(process.cwd(), "src/styles/_04_forms_buttons.scss"),
  "utf8",
);

describe("CGPTextField", () => {
  it("owns the accessible label, description, error, and required state", () => {
    render(
      <CGPTextField
        label="Tên hiển thị"
        description="Tên mà thành viên khác sẽ thấy."
        errorMessage="Vui lòng nhập tên."
        isRequired
        isInvalid
      />,
    );

    const input = screen.getByRole("textbox", { name: "Tên hiển thị" });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Tên mà thành viên khác sẽ thấy. Vui lòng nhập tên.",
    );
    expect(screen.getByText("Vui lòng nhập tên.")).toHaveClass(
      "cgp-field__error",
    );
  });

  it("supports controlled values", async () => {
    const user = userEvent.setup();
    function ControlledField() {
      const [value, setValue] = useState("An");
      return (
        <CGPTextField
          label="Tên"
          value={value}
          onChange={setValue}
        />
      );
    }

    render(<ControlledField />);

    const input = screen.getByRole("textbox", { name: "Tên" });
    expect(input).toHaveValue("An");
    await user.type(input, "h");
    expect(input).toHaveValue("Anh");
  });

  it("maps consumer and owned disabled classes", () => {
    render(
      <CGPTextField label="Tên" className="profile-name" isDisabled />,
    );

    const input = screen.getByRole("textbox", { name: "Tên" });
    expect(input).toBeDisabled();
    expect(input.closest(".cgp-field")).toHaveClass(
      "profile-name",
      "cgp-field--disabled",
    );
  });

  it("supports an uncontrolled default value", async () => {
    const user = userEvent.setup();
    render(<CGPTextField label="Quê quán" defaultValue="Huế" />);

    const input = screen.getByRole("textbox", { name: "Quê quán" });
    await user.type(input, " xưa");
    expect(input).toHaveValue("Huế xưa");
  });
});

describe("CGPPasswordField", () => {
  it("reveals and conceals the password without losing its value", async () => {
    const user = userEvent.setup();
    render(
      <CGPPasswordField
        label="Mật khẩu"
        defaultValue="bi-mat"
        revealLabel="Hiện mật khẩu"
        concealLabel="Ẩn mật khẩu"
      />,
    );

    const input = screen.getByLabelText("Mật khẩu");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("bi-mat");

    await user.click(screen.getByRole("button", { name: "Ẩn mật khẩu" }));
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("bi-mat");
  });
});

describe("CGP field state styles", () => {
  it("owns field, focus, invalid, disabled, and password-toggle selectors", () => {
    expect(FORM_SCSS).toMatch(/\.cgp-field\s*\{/);
    expect(FORM_SCSS).toMatch(/\.cgp-field__control/);
    expect(FORM_SCSS).toMatch(/\.cgp-field__input--focus-visible/);
    expect(FORM_SCSS).toMatch(/\.cgp-field--invalid/);
    expect(FORM_SCSS).toMatch(/\.cgp-field--disabled/);
    expect(FORM_SCSS).toMatch(/\.cgp-field__description/);
    expect(FORM_SCSS).toMatch(/\.cgp-field__error/);
    expect(FORM_SCSS).toMatch(/\.cgp-password-field__toggle/);
  });
});
