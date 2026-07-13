import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/app/providers", () => ({ useSession: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/auth", () => ({
  requestPasswordReset: mocks.requestPasswordReset,
  confirmPasswordReset: mocks.confirmPasswordReset,
}));

import { ForgotPasswordFlow } from "./ForgotPasswordFlow";

describe("ForgotPasswordFlow prototype adapter", () => {
  it("completes both steps without calling live auth actions", async () => {
    const requestAction = vi.fn().mockResolvedValue(undefined);
    const confirmAction = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ForgotPasswordFlow
        requestAction={requestAction}
        confirmAction={confirmAction}
        onComplete={onComplete}
      />,
    );

    await user.type(screen.getByLabelText(/Số điện thoại hoặc email/i), "minh@example.test");
    await user.click(screen.getByRole("button", { name: "Gửi mã" }));
    await user.type(screen.getByLabelText(/Mã xác nhận \(6 chữ số\)/i), "123456");
    await user.type(screen.getByLabelText(/Mật khẩu mới \(ít nhất 8 ký tự\)/i), "MatKhauMoi123");
    await user.click(screen.getByRole("button", { name: "Cập nhật mật khẩu" }));

    expect(requestAction).toHaveBeenCalledWith("minh@example.test");
    expect(confirmAction).toHaveBeenCalledWith("minh@example.test", "123456", "MatKhauMoi123");
    expect(onComplete).toHaveBeenCalledOnce();
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
    expect(mocks.confirmPasswordReset).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
