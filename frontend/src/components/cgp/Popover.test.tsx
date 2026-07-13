import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CGPPopover } from "./Popover";

const POPOVER_SOURCE = readFileSync(
  resolve(process.cwd(), "src/components/cgp/Popover.tsx"),
  "utf8",
);
const POPOVER_SCSS = readFileSync(
  resolve(process.cwd(), "src/styles/_07_sidebar_mobile.scss"),
  "utf8",
);

function PopoverHarness({ onOpenChange = vi.fn() }: { onOpenChange?: (isOpen: boolean) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <CGPPopover
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        setIsOpen(nextIsOpen);
        onOpenChange(nextIsOpen);
      }}
      trigger="Mở menu"
      triggerAriaLabel="Mở menu"
      ariaLabel="Menu cài đặt"
      placement="bottom end"
      size="md"
    >
      <a href="/help">Trợ giúp</a>
    </CGPPopover>
  );
}

describe("CGPPopover", () => {
  it("owns disclosure state and renders an accessible positioned dialog", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<PopoverHarness onOpenChange={onOpenChange} />);

    const trigger = screen.getByRole("button", { name: "Mở menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Menu cài đặt" })).toHaveClass(
      "cgp-popover__dialog",
      "cgp-popover__dialog--md",
    );
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("closes on Escape through the shared overlay contract", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<PopoverHarness onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Mở menu" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Menu cài đặt" })).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});

describe("CGP popover implementation ownership", () => {
  it("delegates outside press and Escape handling without document listeners", () => {
    expect(POPOVER_SOURCE).not.toMatch(/document\.addEventListener/);
    expect(POPOVER_SOURCE).toMatch(/DialogTrigger/);
    expect(POPOVER_SOURCE).toMatch(/Popover/);
  });

  it("owns responsive width, layering, focus, and reduced-motion styles", () => {
    expect(POPOVER_SCSS).toMatch(/\.cgp-popover\s*\{/);
    expect(POPOVER_SCSS).toMatch(/calc\(100vw - 2rem\)/);
    expect(POPOVER_SCSS).toMatch(/max-height:\s*calc\(100dvh - 2rem\)/);
    expect(POPOVER_SCSS).toMatch(/overflow-y:\s*auto/);
    expect(POPOVER_SCSS).toMatch(/z-index:\s*410/);
    expect(POPOVER_SCSS).toMatch(/\.cgp-popover__dialog/);
    expect(POPOVER_SCSS).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
