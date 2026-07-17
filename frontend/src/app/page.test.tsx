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

    expect(screen.getByRole("link", { name: "Hướng dẫn" })).toHaveAttribute("href", "/help");
    expect(screen.getAllByText("Đang kiểm tra phiên đăng nhập…")[0]).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.queryByRole("link", { name: "Tạo cây gia phả" })).not.toBeInTheDocument();
  });

  it("shows the approved create and learn actions to signed-out visitors", () => {
    mockUseSession.mockReturnValue({ user: null, loading: false });
    render(<HomePage />);

    expect(screen.getAllByRole("link", { name: "Tạo cây gia phả" })[0]).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(screen.getByRole("link", { name: "Xem cách hoạt động" })).toHaveAttribute(
      "href",
      "#cach-hoat-dong",
    );
  });

  it("places guidance beside the tree action for signed-in users", () => {
    mockUseSession.mockReturnValue({
      user: { identifier: "owner@example.com", displayName: "Chủ cây", role: "user" },
      loading: false,
    });
    render(<HomePage />);

    expect(screen.getAllByRole("link", { name: "Mở cây gia phả" })[0]).toHaveAttribute(
      "href",
      "/tree",
    );
    expect(screen.queryByRole("link", { name: "Tạo cây gia phả" })).not.toBeInTheDocument();
  });

  it("describes the workflows that are currently available", () => {
    mockUseSession.mockReturnValue({ user: null, loading: false });
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: "Gom lại những người thân, câu chuyện và cách gọi trong gia đình",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nhìn cả gia đình trong một sơ đồ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tìm cách gọi theo người bạn chọn" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Giữ ảnh bên đúng người" })).toBeInTheDocument();
  });
});
