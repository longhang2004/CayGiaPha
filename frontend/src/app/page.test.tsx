import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const { mockUseSession } = vi.hoisted(() => ({ mockUseSession: vi.fn() }));

vi.mock("@/app/providers", () => ({
  useSession: () => mockUseSession(),
}));

describe("HomePage", () => {
  beforeEach(() => mockUseSession.mockReset());

  it("keeps usage guidance available while the session is loading", () => {
    mockUseSession.mockReturnValue({ user: null, loading: true });
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "Hướng dẫn sử dụng" })).toHaveAttribute("href", "/help");
    expect(screen.getByText("Đang kiểm tra phiên đăng nhập…")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Đăng ký ngay" })).not.toBeInTheDocument();
  });

  it("shows signup, signin, and guidance actions to signed-out visitors", () => {
    mockUseSession.mockReturnValue({ user: null, loading: false });
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "Đăng ký ngay" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/signin");
    expect(screen.getByRole("link", { name: "Hướng dẫn sử dụng" })).toHaveAttribute("href", "/help");
  });

  it("places guidance beside the tree action for signed-in users", () => {
    mockUseSession.mockReturnValue({
      user: { identifier: "owner@example.com", displayName: "Chủ cây", role: "user" },
      loading: false,
    });
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "Mở cây gia phả" })).toHaveAttribute("href", "/tree");
    expect(screen.getByRole("link", { name: "Hướng dẫn sử dụng" })).toHaveAttribute("href", "/help");
    expect(screen.queryByRole("link", { name: "Đăng ký ngay" })).not.toBeInTheDocument();
  });

  it("describes the workflows that are currently available", () => {
    mockUseSession.mockReturnValue({ user: null, loading: false });
    render(<HomePage />);

    expect(screen.getByText(/Tạo hoặc tham gia cây gia phả/)).toBeInTheDocument();
    expect(screen.getByText("Quan hệ trực tiếp hoặc tên gọi tự khai báo")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tạo hoặc tham gia một cây" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cùng người thân hoàn thiện" })).toBeInTheDocument();
  });
});
