import { describe, expect, it } from "vitest";
import { cgpStateClassName } from "./stateClassNames";

describe("cgpStateClassName", () => {
  it("combines the owned base class, consumer class, and active interaction states", () => {
    expect(
      cgpStateClassName("cgp-button", "auth-submit", {
        isHovered: true,
        isPressed: false,
        isFocusVisible: true,
        isDisabled: false,
        isPending: true,
      }),
    ).toBe(
      "cgp-button auth-submit cgp-button--hovered cgp-button--focus-visible cgp-button--pending",
    );
  });

  it("does not emit state classes for false or unknown values", () => {
    expect(
      cgpStateClassName("cgp-field", undefined, {
        isInvalid: false,
        isReadOnly: undefined,
        defaultClassName: "react-aria-Field",
      }),
    ).toBe("cgp-field");
  });
});
