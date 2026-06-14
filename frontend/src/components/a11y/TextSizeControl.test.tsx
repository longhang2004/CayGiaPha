import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextSizeProvider } from "./TextSizeProvider";
import { TextSizeControl } from "./TextSizeControl";
import { TEXT_SIZE_STORAGE_KEY } from "@/lib/textSize";

function renderControl() {
  return render(
    <TextSizeProvider>
      <TextSizeControl />
    </TextSizeProvider>,
  );
}

describe("TextSizeControl", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.fontSize = "";
    delete document.documentElement.dataset.textScale;
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.style.fontSize = "";
  });

  it("exposes the slider with a programmatic name and value (18.5)", () => {
    renderControl();
    const slider = screen.getByRole("slider", { name: "Cỡ chữ" });
    expect(slider).toHaveValue("100");
    expect(slider).toHaveAttribute("aria-valuetext", "100%");
  });

  it("exposes keyboard-operable increase/decrease buttons (18.5, 18.6)", () => {
    renderControl();
    expect(screen.getByRole("button", { name: "Tăng cỡ chữ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Giảm cỡ chữ" })).toBeInTheDocument();
  });

  it("scales the document root font-size and persists when increased (18.1, 18.2)", async () => {
    renderControl();
    await userEvent.click(screen.getByRole("button", { name: "Tăng cỡ chữ" }));

    expect(document.documentElement.style.fontSize).toBe("125%");
    expect(window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY)).toBe("125");
    expect(screen.getByRole("slider", { name: "Cỡ chữ" })).toHaveValue("125");
  });

  it("supports scaling up to at least 200% without exceeding it (18.1)", async () => {
    renderControl();
    const increase = screen.getByRole("button", { name: "Tăng cỡ chữ" });
    // 100 -> 200 in steps of 25 (four clicks), then a fifth no-op at the max.
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(increase);
    }
    expect(document.documentElement.style.fontSize).toBe("200%");
    expect(increase).toBeDisabled();
  });

  it("does not go below 100% (decrease disabled at the minimum)", () => {
    renderControl();
    expect(screen.getByRole("button", { name: "Giảm cỡ chữ" })).toBeDisabled();
  });

  it("restores a previously stored size on mount (18.2)", () => {
    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, "150");
    renderControl();
    expect(screen.getByRole("slider", { name: "Cỡ chữ" })).toHaveValue("150");
    expect(document.documentElement.style.fontSize).toBe("150%");
  });
});
