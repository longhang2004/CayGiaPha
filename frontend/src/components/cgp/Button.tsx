"use client";

import { forwardRef, useCallback, useEffect, useRef } from "react";
import {
  Button as ReactAriaButton,
  type ButtonRenderProps,
} from "react-aria-components";
import type { CGPButtonProps, CGPIconButtonProps } from "./contracts";
import { cgpStateClassName } from "./stateClassNames";

function buttonClassName(
  variant: NonNullable<CGPButtonProps["variant"]>,
  size: NonNullable<CGPButtonProps["size"]>,
  consumerClass: string | undefined,
  states: ButtonRenderProps,
): string {
  return cgpStateClassName(
    "cgp-button",
    [`cgp-button--${variant}`, `cgp-button--${size}`, consumerClass]
      .filter(Boolean)
      .join(" "),
    states,
  );
}

export const CGPButton = forwardRef<HTMLButtonElement, CGPButtonProps>(
  function CGPButton(
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      loadingLabel,
      className,
      isDisabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const setButtonRef = useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    // RAC 1.19 filters aria-busy from DOM props. Keep its pending interaction
    // behavior, then restore the legacy/programmatic busy state after mount.
    useEffect(() => {
      if (loading) buttonRef.current?.setAttribute("aria-busy", "true");
      else buttonRef.current?.removeAttribute("aria-busy");
    }, [loading]);

    return (
      <ReactAriaButton
        {...props}
        ref={setButtonRef}
        type={type}
        isDisabled={isDisabled || loading}
        isPending={loading}
        className={(states) =>
          buttonClassName(variant, size, className, states)
        }
      >
        {loading ? (
          <span
            className="cgp-button__spinner btn__spinner"
            aria-hidden="true"
          />
        ) : null}
        {loading ? (loadingLabel ?? children) : children}
      </ReactAriaButton>
    );
  },
);

export const CGPIconButton = forwardRef<
  HTMLButtonElement,
  CGPIconButtonProps
>(function CGPIconButton({ className, children, ...props }, ref) {
  return (
    <CGPButton
      {...props}
      ref={ref}
      className={["cgp-icon-button", className].filter(Boolean).join(" ")}
    >
      {children}
    </CGPButton>
  );
});
