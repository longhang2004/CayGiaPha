import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useRef, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CGPDialog } from "./Dialog";

const DIALOG_SOURCE = readFileSync(
  resolve(process.cwd(), "src/components/cgp/Dialog.tsx"),
  "utf8",
);
const DIALOG_SCSS = readFileSync(
  resolve(process.cwd(), "src/styles/_08_modals_auth.scss"),
  "utf8",
);

describe("CGPDialog", () => {
  it("renders no dialog while closed", () => {
    render(
      <CGPDialog isOpen={false} onOpenChange={vi.fn()} title="Thông tin">
        Nội dung
      </CGPDialog>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("provides modal semantics, title, and optional description associations", () => {
    render(
      <CGPDialog
        isOpen
        onOpenChange={vi.fn()}
        title={<span>Thông tin thành viên</span>}
        description={<span>Kiểm tra trước khi lưu.</span>}
      >
        Nội dung
      </CGPDialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Thông tin thành viên" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Kiểm tra trước khi lưu.");
    expect(document.documentElement).toHaveStyle({ overflow: "hidden" });
  });

  it("notifies close from the visible close control", async () => {
    const onOpenChange = vi.fn();
    render(
      <CGPDialog isOpen onOpenChange={onOpenChange} title="Thông tin">
        Nội dung
      </CGPDialog>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Đóng cửa sổ" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("dismisses with Escape by default", async () => {
    const onOpenChange = vi.fn();
    render(
      <CGPDialog isOpen onOpenChange={onOpenChange} title="Thông tin">
        Nội dung
      </CGPDialog>,
    );

    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog open when Escape dismissal is disabled", async () => {
    const onOpenChange = vi.fn();
    render(
      <CGPDialog
        isOpen
        onOpenChange={onOpenChange}
        title="Thông tin"
        dismissPolicy={{ escape: false, outsidePress: true }}
      >
        Nội dung
      </CGPDialog>,
    );

    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("dismisses from an outside press by default", async () => {
    const onOpenChange = vi.fn();
    render(
      <CGPDialog isOpen onOpenChange={onOpenChange} title="Thông tin">
        Nội dung
      </CGPDialog>,
    );

    await userEvent.click(document.body);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog open when outside dismissal is disabled", async () => {
    const onOpenChange = vi.fn();
    render(
      <CGPDialog
        isOpen
        onOpenChange={onOpenChange}
        title="Thông tin"
        dismissPolicy={{ escape: true, outsidePress: false }}
      >
        Nội dung
      </CGPDialog>,
    );

    await userEvent.click(document.body);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("moves initial focus to a supplied target", () => {
    function Harness() {
      const initialFocusRef = useRef<HTMLButtonElement>(null);
      return (
        <CGPDialog
          isOpen
          onOpenChange={vi.fn()}
          title="Thông tin"
          initialFocusRef={initialFocusRef}
        >
          <button ref={initialFocusRef}>Lưu thay đổi</button>
        </CGPDialog>
      );
    }

    render(<Harness />);
    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toHaveFocus();
  });

  it("restores focus to the previously focused trigger after close", async () => {
    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button onClick={() => setIsOpen(true)}>Mở thông tin</button>
          <CGPDialog isOpen={isOpen} onOpenChange={setIsOpen} title="Thông tin">
            Nội dung
          </CGPDialog>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Mở thông tin" });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: "Đóng cửa sổ" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("owns consumer and fullscreen-mobile class hooks", () => {
    render(
      <CGPDialog
        isOpen
        onOpenChange={vi.fn()}
        title="Thông tin"
        size="fullscreen-mobile"
        className="member-details"
      >
        Nội dung
      </CGPDialog>,
    );

    expect(screen.getByRole("dialog", { name: "Thông tin" })).toHaveClass(
      "cgp-dialog",
      "cgp-dialog--fullscreen-mobile",
      "member-details",
    );
  });
});

describe("CGP dialog implementation ownership", () => {
  it("delegates focus trapping and Escape handling without document listeners", () => {
    expect(DIALOG_SOURCE).not.toMatch(/document\.addEventListener/);
    expect(DIALOG_SOURCE).not.toMatch(/keydown|querySelectorAll/);
  });

  it("owns responsive size, overflow, touch target, and reduced-motion styles", () => {
    expect(DIALOG_SCSS).toMatch(/\.cgp-dialog--sm/);
    expect(DIALOG_SCSS).toMatch(/\.cgp-dialog--md/);
    expect(DIALOG_SCSS).toMatch(/\.cgp-dialog--lg/);
    expect(DIALOG_SCSS).toMatch(/\.cgp-dialog--fullscreen-mobile/);
    expect(DIALOG_SCSS).toMatch(/max-height:/);
    expect(DIALOG_SCSS).toMatch(/overflow-y:\s*auto/);
    expect(DIALOG_SCSS).toMatch(/var\(--min-touch-target\)/);
    expect(DIALOG_SCSS).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
