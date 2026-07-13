/**
 * Accessibility audit: text scaling 100–200% without loss of content or
 * functionality (Requirement 18.1, 18.2).
 *
 * Approach: verify the scaling primitive clamps to the supported [100, 200]
 * range and is applied to the document root, then render a representative screen,
 * scale it to 200% via the live control, and assert that every key control is
 * still present in the DOM and remains operable (no content/functionality lost).
 *
 * Limitation (documented in Requirement 18): jsdom does not reflow/paint, so
 * "no visual clipping" at 200% must also be confirmed by manual/expert review;
 * here we verify the machine-verifiable behaviour (clamping, root application,
 * and persistence of all controls + operability under scaling).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  MAX_TEXT_SCALE,
  MIN_TEXT_SCALE,
  applyTextScale,
  clampTextScale,
} from "@/lib/textSize";
import { TextSizeProvider } from "./TextSizeProvider";
import { TextSizeControl } from "./TextSizeControl";
import { IdentifierForm } from "@/components/auth/IdentifierForm";

function renderScreen(onSubmit: (identifier: string) => Promise<void>) {
  return render(
    <TextSizeProvider>
      <header>
        <TextSizeControl />
      </header>
      <main>
        <IdentifierForm
          heading="Đăng nhập"
          description="Nhập số điện thoại hoặc email."
          submitLabel="Gửi mã"
          onSubmit={onSubmit}
        />
      </main>
    </TextSizeProvider>,
  );
}

describe("text scaling range (18.1)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.fontSize = "";
    delete document.documentElement.dataset.textScale;
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.style.fontSize = "";
  });

  it("clamps any requested scale to [100, 200]", () => {
    expect(clampTextScale(80)).toBe(MIN_TEXT_SCALE);
    expect(clampTextScale(100)).toBe(100);
    expect(clampTextScale(150)).toBe(150);
    expect(clampTextScale(200)).toBe(200);
    expect(clampTextScale(400)).toBe(MAX_TEXT_SCALE);
  });

  it("supports at least 200% of the default size", () => {
    expect(MAX_TEXT_SCALE).toBeGreaterThanOrEqual(200);
  });

  it("applies the requested scale to the document root", () => {
    applyTextScale(200);
    expect(document.documentElement.style.fontSize).toBe("200%");
    expect(document.documentElement.dataset.textScale).toBe("200");
  });
});

describe("no content/functionality loss when scaled to 200% (18.1, 18.2)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.fontSize = "";
    delete document.documentElement.dataset.textScale;
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.style.fontSize = "";
  });

  it("keeps all key controls present and operable after scaling to 200%", async () => {
    const submitted: string[] = [];
    renderScreen(async (identifier) => {
      submitted.push(identifier);
    });

    // Scale up to the maximum (100 -> 200 in steps of 25 = four clicks).
    const increase = screen.getByRole("button", { name: "Tăng cỡ chữ" });
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(increase);
    }
    expect(document.documentElement.style.fontSize).toBe("200%");

    // No content lost: the screen's controls are all still in the DOM.
    const identifierInput = screen.getByRole("textbox", {
      name: "Email",
    });
    const submit = screen.getByRole("button", { name: "Gửi mã" });
    expect(identifierInput).toBeInTheDocument();
    expect(submit).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Cỡ chữ" })).toBeInTheDocument();

    // No functionality lost: the form still operates while scaled to 200%.
    await userEvent.type(identifierInput, "user@example.com");
    await userEvent.click(submit);
    expect(submitted).toEqual(["user@example.com"]);
  });
});
