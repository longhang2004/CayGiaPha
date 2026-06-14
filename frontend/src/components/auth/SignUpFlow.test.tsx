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
  signUp: vi.fn(),
  verifySignUp: vi.fn(),
}));

import { signUp, verifySignUp } from "@/lib/auth";
import { SignUpFlow } from "./SignUpFlow";

afterEach(() => {
  vi.clearAllMocks();
});

describe("SignUpFlow", () => {
  it("calls the signup endpoint, then the verify endpoint, then routes into the app", async () => {
    vi.mocked(signUp).mockResolvedValue({ userId: "u1", verified: false });
    vi.mocked(verifySignUp).mockResolvedValue({
      userId: "u1",
      treeId: "t1",
      verified: true,
    });

    render(<SignUpFlow />);

    const [tos, privacy] = screen.getAllByRole("checkbox");
    await userEvent.click(tos);
    await userEvent.click(privacy);

    await userEvent.type(
      screen.getByLabelText("Số điện thoại hoặc email"),
      "0901234567",
    );
    await userEvent.click(screen.getByRole("button", { name: "Gửi mã xác thực" }));

    expect(signUp).toHaveBeenCalledWith("0901234567");

    // OTP step is now shown.
    const codeInput = await screen.findByLabelText("Mã xác thực");
    await userEvent.type(codeInput, "123456");
    await userEvent.click(screen.getByRole("button", { name: "Xác thực" }));

    expect(verifySignUp).toHaveBeenCalledWith("0901234567", "123456", "Bac", true, true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/");
  });

  it("passes the chosen region (Nam) through to verifySignUp", async () => {
    vi.mocked(signUp).mockResolvedValue({ userId: "u1", verified: false });
    vi.mocked(verifySignUp).mockResolvedValue({
      userId: "u1",
      treeId: "t1",
      verified: true,
    });

    render(<SignUpFlow />);

    const [tos, privacy] = screen.getAllByRole("checkbox");
    await userEvent.click(tos);
    await userEvent.click(privacy);

    await userEvent.selectOptions(
      screen.getByLabelText("Vùng miền (cách xưng hô)"),
      "Nam",
    );
    await userEvent.type(
      screen.getByLabelText("Số điện thoại hoặc email"),
      "0901234567",
    );
    await userEvent.click(screen.getByRole("button", { name: "Gửi mã xác thực" }));

    const codeInput = await screen.findByLabelText("Mã xác thực");
    await userEvent.type(codeInput, "123456");
    await userEvent.click(screen.getByRole("button", { name: "Xác thực" }));

    expect(verifySignUp).toHaveBeenCalledWith("0901234567", "123456", "Nam", true, true);
  });

  it("shows a field error from the envelope and stays on the identifier step", async () => {
    vi.mocked(signUp).mockRejectedValue(
      new ApiError(409, {
        code: "IDENTIFIER_TAKEN",
        field: "identifier",
        message: "Số điện thoại đã được đăng ký.",
      }),
    );

    render(<SignUpFlow />);

    const [tos, privacy] = screen.getAllByRole("checkbox");
    await userEvent.click(tos);
    await userEvent.click(privacy);

    const input = screen.getByLabelText("Số điện thoại hoặc email");
    await userEvent.type(input, "0901234567");
    await userEvent.click(screen.getByRole("button", { name: "Gửi mã xác thực" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Số điện thoại đã được đăng ký.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    // Still on the identifier step (no OTP input yet).
    expect(screen.queryByLabelText("Mã xác thực")).not.toBeInTheDocument();
  });
});
