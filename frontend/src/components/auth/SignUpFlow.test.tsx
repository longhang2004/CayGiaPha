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
  signInWithGoogle: vi.fn(),
}));

import { signUp } from "@/lib/auth";
import { SignUpFlow } from "./SignUpFlow";
import { GoogleOAuthProvider } from "@react-oauth/google";

afterEach(() => {
  vi.clearAllMocks();
});

async function fillRequiredFields(options?: { displayName?: string; skipDisplayName?: boolean }) {
  const [tos, privacy] = screen.getAllByRole("checkbox");
  await userEvent.click(tos);
  await userEvent.click(privacy);

  if (!options?.skipDisplayName) {
    await userEvent.type(
      screen.getByLabelText(/Tên hiển thị/i),
      options?.displayName ?? "Nguyễn Văn A",
    );
  }
  await userEvent.type(
    screen.getByLabelText(/Email/i),
    "test@example.com",
  );
  await userEvent.type(
    screen.getByLabelText(/^Mật khẩu/i),
    "password123",
  );
}

describe("SignUpFlow", () => {
  it("renders signup controls through CGP-owned fields", () => {
    render(
      <GoogleOAuthProvider clientId="test">
        <SignUpFlow />
      </GoogleOAuthProvider>,
    );

    expect(screen.getByRole("textbox", { name: /Tên hiển thị/i }).closest(".cgp-field"))
      .toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Email/i }).closest(".cgp-field"))
      .toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu/i).closest(".cgp-password-field"))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vùng miền/i }).closest(".cgp-select"))
      .toBeInTheDocument();
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox.closest(".cgp-checkbox")).toBeInTheDocument();
    }
  });

  it("links back to sign in while preserving invitation context", () => {
    render(
      <SignUpFlow
        redirectTo="/invitation/inv-1"
        reason="invitation"
      />,
    );

    expect(screen.getByRole("link", { name: "Đã có tài khoản?" })).toHaveAttribute(
      "href",
      "/signin?redirect=%2Finvitation%2Finv-1&reason=invitation",
    );
  });
  it("requires display name with autocomplete=name and hint", () => {
    render(
      <GoogleOAuthProvider clientId="test">
        <SignUpFlow />
      </GoogleOAuthProvider>
    );

    const nameInput = screen.getByLabelText(/Tên hiển thị/i);
    expect(nameInput).toBeRequired();
    expect(nameInput).toHaveAttribute("autoComplete", "name");
    expect(
      screen.getByText("Tên này sẽ được dùng để người thân nhận ra bạn khi cộng tác."),
    ).toBeInTheDocument();
  });

  it("calls the signup endpoint with displayName and routes into the app", async () => {
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

    await fillRequiredFields({ displayName: "Nguyễn Văn A" });
    await userEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    expect(signUp).toHaveBeenCalledWith(
      "test@example.com",
      "password123",
      "Bac",
      true,
      true,
      "Nguyễn Văn A",
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/");
  });

  it("shows a field-level error when display name is empty", async () => {
    render(
      <GoogleOAuthProvider clientId="test">
        <SignUpFlow />
      </GoogleOAuthProvider>
    );

    await fillRequiredFields({ skipDisplayName: true });
    await userEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Vui lòng nhập tên hiển thị.");
    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Tên hiển thị/i)).toHaveAttribute("aria-invalid", "true");
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

    await userEvent.click(screen.getByRole("button", { name: /Vùng miền/i }));
    await userEvent.click(screen.getByRole("option", { name: /Miền Nam/i }));
    await fillRequiredFields({ displayName: "Trần Thị B" });
    await userEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    expect(signUp).toHaveBeenCalledWith(
      "test@example.com",
      "password123",
      "Nam",
      true,
      true,
      "Trần Thị B",
    );
  });

  it("shows a field error from the envelope", async () => {
    vi.mocked(signUp).mockRejectedValue(
      new ApiError(409, {
        code: "IDENTIFIER_TAKEN",
        field: "identifier",
        message: "Email đã được đăng ký.",
      }),
    );

    render(
      <GoogleOAuthProvider clientId="test">
        <SignUpFlow />
      </GoogleOAuthProvider>
    );

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Email đã được đăng ký.");
    expect(screen.getByLabelText(/Email/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a displayName field error from the envelope", async () => {
    vi.mocked(signUp).mockRejectedValue(
      new ApiError(400, {
        code: "validation_error",
        field: "displayName",
        message: "Tên hiển thị phải từ 1 đến 100 ký tự.",
      }),
    );

    render(
      <GoogleOAuthProvider clientId="test">
        <SignUpFlow />
      </GoogleOAuthProvider>
    );

    await fillRequiredFields({ displayName: "X" });
    await userEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Tên hiển thị phải từ 1 đến 100 ký tự.");
    expect(screen.getByLabelText(/Tên hiển thị/i)).toHaveAttribute("aria-invalid", "true");
  });
});
