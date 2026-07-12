import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/apiClient";
import { IdentifierForm } from "./IdentifierForm";

function renderForm(onSubmit: (identifier: string) => Promise<void>) {
  return render(
    <IdentifierForm
      heading="Đăng ký"
      description="Nhập số điện thoại hoặc email."
      submitLabel="Gửi mã xác thực"
      onSubmit={onSubmit}
    />,
  );
}

describe("IdentifierForm", () => {
  it("renders the identifier through the CGP-owned field boundary", () => {
    renderForm(vi.fn().mockResolvedValue(undefined));

    expect(
      screen.getByRole("textbox", { name: "Số điện thoại hoặc email" })
        .closest(".cgp-field"),
    ).toBeInTheDocument();
  });

  it("submits the trimmed identifier", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    await userEvent.type(
      screen.getByLabelText(/Số điện thoại hoặc email/i),
      "  0901234567  ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Gửi mã xác thực" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("0901234567");
  });

  it("renders a field-level error from the envelope against the identifier input", async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(400, {
        code: "VALIDATION_ERROR",
        field: "identifier",
        message: "Số điện thoại không hợp lệ.",
      }),
    );
    renderForm(onSubmit);

    const input = screen.getByLabelText(/Số điện thoại hoặc email/i);
    await userEvent.type(input, "abc");
    await userEvent.click(screen.getByRole("button", { name: "Gửi mã xác thực" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Số điện thoại không hợp lệ.");
    // The error is programmatically associated with the input.
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "Số điện thoại không hợp lệ.",
    );
  });

  it("renders a form-level error when the envelope names no field", async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(429, {
        code: "TOO_MANY_ATTEMPTS",
        message: "Bạn đã thử quá nhiều lần.",
      }),
    );
    renderForm(onSubmit);

    await userEvent.type(screen.getByLabelText(/Số điện thoại hoặc email/i), "0901234567");
    await userEvent.click(screen.getByRole("button", { name: "Gửi mã xác thực" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Bạn đã thử quá nhiều lần.");
    expect(screen.getByLabelText(/Số điện thoại hoặc email/i)).not.toHaveAttribute(
      "aria-invalid",
    );
  });
});
