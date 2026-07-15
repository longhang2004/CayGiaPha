import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CGPDrawer } from "./Drawer";

const DRAWER_SOURCE = readFileSync(
  resolve(process.cwd(), "src/components/cgp/Drawer.tsx"),
  "utf8",
);
const DRAWER_SCSS = readFileSync(
  resolve(process.cwd(), "src/styles/_07_sidebar_mobile.scss"),
  "utf8",
);

function ModalDrawerHarness() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setIsOpen(true)}>
        Mở menu
      </button>
      <CGPDrawer
        id="app-drawer"
        presentation="modal"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        returnFocusRef={triggerRef}
        label="Menu ứng dụng"
        safeAreaEdge="left"
      >
        <a href="/tree">Danh sách cây</a>
      </CGPDrawer>
    </>
  );
}

describe("CGPDrawer", () => {
  it("renders persistent navigation without modal semantics", () => {
    render(
      <CGPDrawer presentation="persistent" label="Menu ứng dụng">
        <a href="/tree">Danh sách cây</a>
      </CGPDrawer>,
    );

    expect(screen.getByRole("complementary", { name: "Menu ứng dụng" })).toHaveClass(
      "cgp-drawer",
      "cgp-drawer--persistent",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("unmounts a closed modal drawer and restores focus after Escape", async () => {
    const user = userEvent.setup();
    render(<ModalDrawerHarness />);

    const trigger = screen.getByRole("button", { name: "Mở menu" });
    expect(screen.queryByRole("dialog", { name: "Menu ứng dụng" })).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Menu ứng dụng" })).toHaveAttribute(
      "data-graph-safe-external",
      "left",
    );

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Menu ứng dụng" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("provides an explicit accessible close control", async () => {
    const user = userEvent.setup();
    render(<ModalDrawerHarness />);

    await user.click(screen.getByRole("button", { name: "Mở menu" }));
    const closeButton = screen.getByRole("button", { name: "Đóng menu ứng dụng" });
    expect(closeButton.querySelector("svg")).toBeInTheDocument();
    await user.click(closeButton);

    expect(screen.queryByRole("dialog", { name: "Menu ứng dụng" })).not.toBeInTheDocument();
  });
});

describe("CGP drawer implementation ownership", () => {
  it("delegates modal interaction without document listeners", () => {
    expect(DRAWER_SOURCE).not.toMatch(/document\.addEventListener/);
    expect(DRAWER_SOURCE).toMatch(/ModalOverlay/);
    expect(DRAWER_SOURCE).toMatch(/Modal/);
    expect(DRAWER_SOURCE).toMatch(/Dialog/);
  });

  it("owns placement, scroll, safe-area, and reduced-motion styles", () => {
    expect(DRAWER_SCSS).toMatch(/\.cgp-drawer--left/);
    expect(DRAWER_SCSS).toMatch(/overflow-y:\s*auto/);
    expect(DRAWER_SCSS).toMatch(/overscroll-behavior:\s*contain/);
    expect(DRAWER_SCSS).toMatch(/\.cgp-drawer--modal\s*\{[^}]*background:\s*var\(--color-surface-card\)/s);
    expect(DRAWER_SCSS).toMatch(/safe-area-inset/);
    expect(DRAWER_SCSS).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
