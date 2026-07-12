import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CGPButton, CGPIconButton } from "./Button";

const BUTTON_SCSS = readFileSync(
  resolve(process.cwd(), "src/styles/_04_forms_buttons.scss"),
  "utf8",
);

describe("CGPButton", () => {
  it("maps variant, size, consumer class, and disabled interaction state to owned classes", () => {
    render(
      <CGPButton
        variant="secondary"
        size="lg"
        className="auth-submit"
        isDisabled
      >
        Lưu
      </CGPButton>,
    );

    expect(screen.getByRole("button", { name: "Lưu" })).toHaveClass(
      "cgp-button",
      "cgp-button--secondary",
      "cgp-button--lg",
      "auth-submit",
      "cgp-button--disabled",
    );
  });

  it("exposes loading state, replaces the label, and blocks activation", async () => {
    const onPress = vi.fn();
    render(
      <CGPButton loading loadingLabel="Đang lưu" onPress={onPress}>
        Lưu
      </CGPButton>,
    );

    const button = screen.getByRole("button", { name: "Đang lưu" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector(".cgp-button__spinner")).toBeInTheDocument();
    await userEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("preserves native form submission behavior", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <CGPButton type="submit">Gửi</CGPButton>
      </form>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Gửi" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("CGPIconButton", () => {
  it("requires and exposes an accessible label without naming the decorative icon", () => {
    render(
      <CGPIconButton aria-label="Đóng cửa sổ">
        <svg aria-hidden="true" />
      </CGPIconButton>,
    );

    expect(
      screen.getByRole("button", { name: "Đóng cửa sổ" }),
    ).toHaveClass("cgp-icon-button");
  });
});

describe("CGP button state styles", () => {
  it("owns focus, pending, variant, size, and icon-button selectors", () => {
    expect(BUTTON_SCSS).toMatch(
      /\.cgp-button\s*\{[^}]*padding:\s*0\.75rem 1\.5rem;[^}]*border-radius:\s*9999px;/s,
    );
    expect(BUTTON_SCSS).toMatch(/\.cgp-button--focus-visible/);
    expect(BUTTON_SCSS).toMatch(/\.cgp-button--pending/);
    expect(BUTTON_SCSS).toMatch(/\.cgp-button--danger/);
    expect(BUTTON_SCSS).toMatch(/\.cgp-button--quiet/);
    expect(BUTTON_SCSS).toMatch(/\.cgp-button--link/);
    expect(BUTTON_SCSS).toMatch(/\.cgp-button--sm/);
    expect(BUTTON_SCSS).toMatch(/\.cgp-button--lg/);
    expect(BUTTON_SCSS).toMatch(/\.cgp-icon-button/);
  });
});
