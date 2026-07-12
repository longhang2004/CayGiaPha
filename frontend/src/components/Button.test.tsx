import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its children as an accessible button", () => {
    render(<Button>Đăng nhập</Button>);
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeInTheDocument();
  });

  it("invokes onClick when activated", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Lưu</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("preserves legacy classes, native disabled, loading, and trailing-icon hooks", () => {
    render(
      <Button
        className="btn-secondary auth-submit"
        loading
        loadingLabel="Đang lưu"
        icon={<span>Tiếp</span>}
      >
        Lưu
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Đang lưu Tiếp" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("btn", "btn-secondary", "auth-submit");
    expect(button.querySelector(".btn__spinner")).toBeInTheDocument();
    expect(button.querySelector(".btn-trailing-icon")).toBeInTheDocument();
  });
});
