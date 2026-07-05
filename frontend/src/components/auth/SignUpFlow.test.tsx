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
}));

import { signUp } from "@/lib/auth";
import { SignUpFlow } from "./SignUpFlow";
import { GoogleOAuthProvider } from "@react-oauth/google";

afterEach(() => {
  vi.clearAllMocks();
});

describe("SignUpFlow", () => {
  it("calls the signup endpoint directly and routes into the app", async () => {
    vi.mocked(signUp).mockResolvedValue({
      userId: "u1",
      treeId: "t1",
      verified: true,
    });

    render(
      <GoogleOAuthProvider clientId="test">
        <SignUpFlow />
      </GoogleOAuthProvider>
    );

    const [tos, privacy] = screen.getAllByRole("checkbox");
    await userEvent.click(tos);
    await userEvent.click(privacy);

    await userEvent.type(
      screen.getByLabelText(/Số điện thoại hoặc email/i),
      "0901234567",
    );
    await userEvent.type(
      screen.getByLabelText(/^Mật khẩu/i),
      "password123",
    );
    await userEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    expect(signUp).toHaveBeenCalledWith("0901234567", "password123", "Bac", true, true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/");
  });

  it("passes the chosen region (Nam) through to signUp", async () => {
    vi.mocked(signUp).mockResolvedValue({
      userId: "u1",
      treeId: "t1",
      verified: true,
    });

    render(
      <GoogleOAuthProvider clientId="test">
        <SignUpFlow />
      </GoogleOAuthProvider>
    );

    const [tos, privacy] = screen.getAllByRole("checkbox");
    await userEvent.click(tos);
    await userEvent.click(privacy);

    await userEvent.selectOptions(
      screen.getByLabelText(/Vùng miền/i),
      "Nam",
    );
    await userEvent.type(
      screen.getByLabelText(/Số điện thoại hoặc email/i),
      "0901234567",
    );
    await userEvent.type(
      screen.getByLabelText(/^Mật khẩu/i),
      "password123",
    );
    await userEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    expect(signUp).toHaveBeenCalledWith("0901234567", "password123", "Nam", true, true);
  });

  it("shows a field error from the envelope", async () => {
    vi.mocked(signUp).mockRejectedValue(
      new ApiError(409, {
        code: "IDENTIFIER_TAKEN",
        field: "identifier",
        message: "Số điện thoại đã được đăng ký.",
      }),
    );

    render(
      <GoogleOAuthProvider clientId="test">
        <SignUpFlow />
      </GoogleOAuthProvider>
    );

    const [tos, privacy] = screen.getAllByRole("checkbox");
    await userEvent.click(tos);
    await userEvent.click(privacy);

    const input = screen.getByLabelText(/Số điện thoại hoặc email/i);
    await userEvent.type(input, "0901234567");
    await userEvent.type(
      screen.getByLabelText(/^Mật khẩu/i),
      "password123",
    );
    await userEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Số điện thoại đã được đăng ký.");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
