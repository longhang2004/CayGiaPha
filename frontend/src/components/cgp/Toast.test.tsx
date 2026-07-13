import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CGPToastProvider, useCGPToast } from "./Toast";

const TOAST_SCSS = readFileSync(
  resolve(process.cwd(), "src/styles/_09_animations.scss"),
  "utf8",
);

function ShowToast({
  message,
  tone = "success",
  timeout = null,
  onDisposer,
}: {
  message: string;
  tone?: "neutral" | "success" | "error" | "info";
  timeout?: number | null;
  onDisposer?: (dispose: () => void) => void;
}) {
  const toast = useCGPToast();

  useEffect(() => {
    const dispose = toast.show(message, { tone, timeout });
    onDisposer?.(dispose);
  }, [message, onDisposer, timeout, toast, tone]);

  return null;
}

function ShowActionToast({ onAction }: { onAction: () => void }) {
  const toast = useCGPToast();

  useEffect(() => {
    toast.show("Có bản cập nhật", {
      timeout: null,
      action: { label: "Xem", onAction },
    });
  }, [onAction, toast]);

  return null;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("CGP toast foundation", () => {
  it("renders an accessible tone-owned toast and lets the returned disposer remove it", () => {
    let dispose: (() => void) | undefined;

    render(
      <CGPToastProvider>
        <ShowToast
          message="Đã lưu thay đổi"
          onDisposer={(nextDispose) => {
            dispose = nextDispose;
          }}
        />
      </CGPToastProvider>,
    );

    expect(screen.getByRole("region", { name: "Thông báo" })).toHaveClass(
      "cgp-toast-region",
    );
    expect(screen.getByRole("alert")).toHaveClass(
      "cgp-toast",
      "cgp-toast--success",
    );
    expect(screen.getByText("Đã lưu thay đổi")).toBeInTheDocument();

    act(() => dispose?.());

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("supports accessible dismissal without waiting for the timeout", async () => {
    render(
      <CGPToastProvider>
        <ShowToast message="Không thể lưu" tone="error" />
      </CGPToastProvider>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Đóng thông báo" }),
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("honors an explicit timeout from the public contract", () => {
    vi.useFakeTimers();

    render(
      <CGPToastProvider>
        <ShowToast message="Tự đóng" tone="info" timeout={1200} />
      </CGPToastProvider>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1199));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("runs an accessible action and closes by default", async () => {
    const onAction = vi.fn();
    render(
      <CGPToastProvider>
        <ShowActionToast onAction={onAction} />
      </CGPToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Xem" }));

    expect(onAction).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("CGP toast styles", () => {
  it("owns the toast region, tones, focus affordance, and responsive placement", () => {
    expect(TOAST_SCSS).toMatch(/\.cgp-toast-region\s*\{/);
    expect(TOAST_SCSS).toMatch(/\.cgp-toast\s*\{/);
    expect(TOAST_SCSS).toMatch(/\.cgp-toast--success/);
    expect(TOAST_SCSS).toMatch(/\.cgp-toast--error/);
    expect(TOAST_SCSS).toMatch(
      /\.cgp-toast__close\.cgp-button--focus-visible/,
    );
    expect(TOAST_SCSS).toMatch(/@media \(max-width: 768px\)[\s\S]*\.cgp-toast-region/);
  });
});
