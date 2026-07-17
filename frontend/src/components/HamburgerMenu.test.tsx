import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

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

  it("offers homepage anchors and closes after marketing navigation", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(
      screen.getByRole("button", {
        name: "Cài đặt hiển thị và Trợ giúp",
      }),
    );

    expect(screen.getByRole("link", { name: "Cách hoạt động" })).toHaveAttribute(
      "href",
      "/#cach-hoat-dong",
    );
    expect(screen.getByRole("link", { name: "Tính năng" })).toHaveAttribute(
      "href",
      "/#tinh-nang",
    );
    expect(screen.getByRole("link", { name: "Riêng tư" })).toHaveAttribute(
      "href",
      "/#rieng-tu",
    );
    expect(screen.getByRole("link", { name: "Hướng dẫn sử dụng" })).toHaveAttribute(
      "href",
      "/help",
    );

    await user.click(screen.getByRole("link", { name: "Cách hoạt động" }));
    expect(screen.queryByRole("dialog", { name: "Menu cài đặt" })).not.toBeInTheDocument();
  });

  it("switches the interface directly between dark and light mode", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Cài đặt hiển thị và Trợ giúp" }));

    const toggle = screen.getByRole("switch", { name: "Giao diện tối" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(window.localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).not.toHaveClass("light");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(window.localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement).toHaveClass("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
