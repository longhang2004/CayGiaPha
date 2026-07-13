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
}));

import { signIn } from "@/lib/auth";
import { SignInFlow } from "./SignInFlow";
import { GoogleOAuthProvider } from "@react-oauth/google";

afterEach(() => {
  vi.clearAllMocks();
});

describe("SignInFlow", () => {
  it("renders identifier and password through CGP-owned field boundaries", () => {
    render(
      <GoogleOAuthProvider clientId="test">
        <SignInFlow />
      </GoogleOAuthProvider>,
    );

    expect(
      screen.getByRole("textbox", { name: /Email/i })
        .closest(".cgp-field"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu/i)).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByLabelText(/^Mật khẩu/i).closest(".cgp-password-field"),
    ).toBeInTheDocument();
  });

  it("links to sign up while preserving invitation context", () => {
    render(<GoogleOAuthProvider clientId="test"><SignInFlow redirectTo="/invitation/inv-1" reason="invitation" /></GoogleOAuthProvider>);

    expect(screen.getByRole("link", { name: "Chưa có tài khoản?" })).toHaveAttribute(
      "href",
      "/signup?redirect=%2Finvitation%2Finv-1&reason=invitation",
    );
  });
  it("submits the identifier and password, refreshes the session, and routes into the app", async () => {
    vi.mocked(signIn).mockResolvedValue(undefined);

    render(
      <GoogleOAuthProvider clientId="test">
        <SignInFlow />
      </GoogleOAuthProvider>
    );

    await userEvent.type(
      screen.getByLabelText(/Email/i),
      "user@example.com",
    );
    await userEvent.type(
      screen.getByLabelText(/^Mật khẩu/i),
      "mypassword123",
    );
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(signIn).toHaveBeenCalledWith("user@example.com", "mypassword123");
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

    render(
      <GoogleOAuthProvider clientId="test">
        <SignInFlow />
      </GoogleOAuthProvider>
    );

    const input = screen.getByLabelText(/Email/i);
    await userEvent.type(input, "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không tìm thấy tài khoản.");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
