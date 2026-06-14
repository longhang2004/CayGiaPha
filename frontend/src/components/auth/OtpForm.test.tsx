import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/apiClient";
import { OtpForm } from "./OtpForm";

function renderForm(onSubmit: (code: string) => Promise<void>) {
  return render(
    <OtpForm
      heading="Xác thực"
      identifier="0901234567"
      submitLabel="Xác thực"
      onSubmit={onSubmit}
    />,
  );
}

describe("OtpForm", () => {
  it("submits the entered code", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    await userEvent.type(screen.getByLabelText("Mã xác thực"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Xác thực" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("123456");
  });

  it("renders a verification error against the code input", async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(401, {
        code: "CODE_INVALID",
        field: "code",
        message: "Mã xác thực không đúng.",
      }),
    );
    renderForm(onSubmit);

    const input = screen.getByLabelText("Mã xác thực");
    await userEvent.type(input, "000000");
    await userEvent.click(screen.getByRole("button", { name: "Xác thực" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Mã xác thực không đúng.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
  });
});
