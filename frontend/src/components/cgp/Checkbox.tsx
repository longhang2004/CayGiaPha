"use client";

import { useId } from "react";
import { Checkbox as ReactAriaCheckbox } from "react-aria-components";
import type { CGPCheckboxProps } from "./contracts";
import { cgpStateClassName } from "./stateClassNames";

export function CGPCheckbox({
  children,
  description,
  errorMessage,
  className,
  "aria-describedby": externalDescription,
  ...checkboxProps
}: CGPCheckboxProps) {
  const generatedId = useId();
  const descriptionId = description
    ? `cgp-checkbox-${generatedId}-description`
    : undefined;
  const errorId = errorMessage
    ? `cgp-checkbox-${generatedId}-error`
    : undefined;
  const describedBy = [externalDescription, descriptionId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="cgp-checkbox-field">
      <ReactAriaCheckbox
        {...checkboxProps}
        aria-describedby={describedBy}
        className={(states) =>
          cgpStateClassName("cgp-checkbox", className, states)
        }
      >
        <span aria-hidden="true" className="cgp-checkbox__box">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
            <path d="m3 8 3 3 7-7" />
          </svg>
        </span>
        <span className="cgp-checkbox__label">{children}</span>
      </ReactAriaCheckbox>
      {description ? (
        <span id={descriptionId} className="cgp-checkbox__description">
          {description}
        </span>
      ) : null}
      {errorMessage ? (
        <span id={errorId} role="alert" className="cgp-checkbox__error">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
