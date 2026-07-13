import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { TextSizeProvider } from "./a11y/TextSizeProvider";
import { HamburgerMenu } from "./HamburgerMenu";

vi.mock("next/link", () => ({
  default: ({ onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    />
  ),
}));

function renderMenu() {
  return render(
    <TextSizeProvider>
      <HamburgerMenu />
    </TextSizeProvider>,
  );
}

describe("HamburgerMenu", () => {
  it("opens the settings menu through the shared CGP popover", async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole("button", {
      name: "Cài đặt hiển thị và Trợ giúp",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Menu cài đặt" })).toHaveClass(
      "cgp-popover__dialog",
      "cgp-popover__dialog--md",
    );
  });

  it("closes the popover after choosing a navigation link", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(
      screen.getByRole("button", {
        name: "Cài đặt hiển thị và Trợ giúp",
      }),
    );
    await user.click(screen.getByRole("link", { name: "Ủng hộ" }));

    expect(
      screen.queryByRole("dialog", { name: "Menu cài đặt" }),
    ).not.toBeInTheDocument();
  });
});
