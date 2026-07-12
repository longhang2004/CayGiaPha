import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CGPSelect } from "./Select";

const FORM_SCSS = readFileSync(
  resolve(process.cwd(), "src/styles/_04_forms_buttons.scss"),
  "utf8",
);

const REGIONS = [
  { value: "Bac", label: "Miền Bắc — Bố, Mẹ" },
  { value: "Trung", label: "Miền Trung — Ba, Mạ" },
  { value: "Nam", label: "Miền Nam — Tía, Má", disabled: true },
];

describe("CGPSelect", () => {
  it("owns label, description, error, required, and invalid semantics", () => {
    render(
      <CGPSelect
        label="Vùng miền"
        description="Quyết định cách xưng hô."
        errorMessage="Vui lòng chọn vùng miền."
        items={REGIONS}
        isRequired
        isInvalid
      />,
    );

    const select = screen.getByRole("button", { name: /Vùng miền/ });
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription(
      "Quyết định cách xưng hô. Vui lòng chọn vùng miền.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Vui lòng chọn vùng miền.",
    );
    expect(select.closest(".cgp-select")).toHaveClass(
      "cgp-select--invalid",
      "cgp-select--required",
    );
  });

  it("supports controlled selection and disabled items", async () => {
    const user = userEvent.setup();
    function ControlledSelect() {
      const [region, setRegion] = useState("Bac");
      return (
        <CGPSelect
          label="Vùng miền"
          items={REGIONS}
          selectedKey={region}
          onSelectionChange={(key) => setRegion(String(key))}
        />
      );
    }

    render(<ControlledSelect />);
    const trigger = screen.getByRole("button", { name: /Vùng miền/ });
    expect(trigger).toHaveTextContent("Miền Bắc — Bố, Mẹ");
    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: "Miền Trung — Ba, Mạ" }));
    expect(trigger).toHaveTextContent("Miền Trung — Ba, Mạ");
  });
});

describe("CGP select styles", () => {
  it("owns trigger, focus, invalid, popover, and option selectors", () => {
    expect(FORM_SCSS).toMatch(/\.cgp-select\s*\{/);
    expect(FORM_SCSS).toMatch(/\.cgp-select__trigger--focus-visible/);
    expect(FORM_SCSS).toMatch(/\.cgp-select--invalid/);
    expect(FORM_SCSS).toMatch(/\.cgp-select__popover/);
    expect(FORM_SCSS).toMatch(/\.cgp-select__option--selected/);
  });
});
