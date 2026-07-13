import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppLayoutWrapper } from "./AppLayoutWrapper";

let isMobile = true;
let mediaChangeListener: (() => void) | undefined;

vi.mock("next/navigation", () => ({
  usePathname: () => "/prototype/tree",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/providers", () => ({
  useSession: () => ({ user: null, loading: false }),
}));

describe("AppLayoutWrapper responsive sidebar", () => {
  beforeEach(() => {
    isMobile = true;
    mediaChangeListener = undefined;
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        get matches() {
          return isMobile;
        },
        media: "(max-width: 900px)",
        onchange: null,
        addEventListener: (_type: string, listener: () => void) => {
          mediaChangeListener = listener;
        },
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("switches between modal and persistent presentation and restores trigger focus", async () => {
    const user = userEvent.setup();
    render(
      <AppLayoutWrapper>
        <main>Nội dung cây</main>
      </AppLayoutWrapper>,
    );

    const trigger = screen.getByRole("button", { name: "Mở menu ứng dụng" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Menu ứng dụng" }),
      ).not.toBeInTheDocument(),
    );

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Menu ứng dụng" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Menu ứng dụng" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    isMobile = false;
    act(() => mediaChangeListener?.());
    expect(
      screen.getByRole("complementary", { name: "Menu ứng dụng" }),
    ).toBeInTheDocument();

    isMobile = true;
    act(() => mediaChangeListener?.());
    expect(
      screen.queryByRole("complementary", { name: "Menu ứng dụng" }),
    ).not.toBeInTheDocument();
  });
});
