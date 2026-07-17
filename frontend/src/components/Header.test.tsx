import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

vi.mock("@/app/providers", () => ({
  useSession: () => ({ user: null, loading: false }),
}));
vi.mock("@/components/HamburgerMenu", () => ({ HamburgerMenu: () => null }));
vi.mock("@/components/ui/NotificationBell", () => ({ NotificationBell: () => null }));
vi.mock("@/components/auth/SignOutButton", () => ({ SignOutButton: () => null }));

describe("Header marketing navigation", () => {
  it("uses absolute homepage anchors so navigation also works from Help", () => {
    render(<Header />);

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
    expect(screen.getByRole("link", { name: "Hướng dẫn" })).toHaveAttribute(
      "href",
      "/help",
    );
  });
});
