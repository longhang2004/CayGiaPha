import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/apiClient";

const push = vi.fn();
const refresh = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/app/providers", () => ({
  useSession: () => ({ refresh }),
}));

vi.mock("@/lib/auth", () => ({
  signIn: vi.fn(),
  verifySignIn: vi.fn(),
}));

import { signIn, verifySignIn } from "@/lib/auth";
import { SignInFlow } from "./SignInFlow";

afterEach(() => {
  vi.clearAllMocks();
});

describe("SignInFlow", () => {
  it("requests a code, verifies it, refreshes the session, and routes into the app", async () => {
    vi.mocked(signIn).mockResolvedValue(undefined);
    vi.mocked(verifySignIn).mockResolvedValue(undefined);

    render(<SignInFlow />);

    await userEvent.type(
      screen.getByLabelText("Số điện thoại hoặc email"),
      "user@example.com",
    );
    await userEvent.click(screen.getByRole("button", { name: "Gửi mã xác thực" }));

    expect(signIn).toHaveBeenCalledWith("user@example.com");

    const codeInput = await screen.findByLabelText("Mã xác thực");
    await userEvent.type(codeInput, "654321");
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(verifySignIn).toHaveBeenCalledWith("user@example.com", "654321");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/");
  });

  it("surfaces an account-not-found error from the envelope", async () => {
    vi.mocked(signIn).mockRejectedValue(
      new ApiError(401, {
        code: "ACCOUNT_NOT_FOUND",
        field: "identifier",
        message: "Không tìm thấy tài khoản.",
      }),
    );

    render(<SignInFlow />);

    const input = screen.getByLabelText("Số điện thoại hoặc email");
    await userEvent.type(input, "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Gửi mã xác thực" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không tìm thấy tài khoản.");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
