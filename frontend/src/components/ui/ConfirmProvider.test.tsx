import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ConfirmProvider, useConfirm } from "./ConfirmProvider";

function Harness() {
  const { requestConfirm } = useConfirm();
  const [result, setResult] = useState("none");

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const accepted = await requestConfirm({
            title: "Xóa cây?",
            message: "Thao tác này không thể hoàn tác.",
            destructive: true,
          });
          setResult(String(accepted));
        }}
      >
        Mở xác nhận
      </button>
      <output aria-label="Kết quả">{result}</output>
    </>
  );
}

describe("ConfirmProvider", () => {
  it("renders confirmations through CGPDialog and resolves true", async () => {
    render(<ConfirmProvider><Harness /></ConfirmProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Mở xác nhận" }));

    expect(screen.getByRole("dialog", { name: "Xóa cây?" })).toHaveClass(
      "cgp-dialog",
      "cgp-confirm-dialog",
    );
    await userEvent.click(screen.getByRole("button", { name: "Đồng ý" }));
    expect(screen.getByRole("status", { name: "Kết quả" })).toHaveTextContent("true");
  });

  it("resolves false when cancelled with Escape", async () => {
    render(<ConfirmProvider><Harness /></ConfirmProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Mở xác nhận" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("status", { name: "Kết quả" })).toHaveTextContent("false");
  });
});
