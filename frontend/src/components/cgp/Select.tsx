"use client";

import { useEffect, useRef } from "react";
import {
  Button,
  FieldError,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select as ReactAriaSelect,
  SelectValue,
  Text,
} from "react-aria-components";
import type { CGPSelectProps } from "./contracts";
import { cgpStateClassName } from "./stateClassNames";

export function CGPSelect({
  label,
  description,
  errorMessage,
  className,
  items,
  placeholder = "Chọn một mục",
  ...selectProps
}: CGPSelectProps) {
  const itemList = Array.from(items);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // RAC 1.19 filters aria-invalid from its Button primitive. Restore it on the
  // focusable select trigger so validation state is exposed at the control.
  useEffect(() => {
    if (selectProps.isInvalid) {
      triggerRef.current?.setAttribute("aria-invalid", "true");
    } else {
      triggerRef.current?.removeAttribute("aria-invalid");
    }
  }, [selectProps.isInvalid]);

  return (
    <ReactAriaSelect
      {...selectProps}
      placeholder={placeholder}
      className={(states) =>
        cgpStateClassName("cgp-select", className, states)
      }
    >
      <Label className="cgp-select__label">
        {label}
        {selectProps.isRequired ? (
          <span aria-hidden="true" className="cgp-select__required">
            *
          </span>
        ) : null}
      </Label>
      <Button
        ref={triggerRef}
        className={(states) =>
          cgpStateClassName("cgp-select__trigger", undefined, states)
        }
      >
        <SelectValue className="cgp-select__value" />
        <svg
          aria-hidden="true"
          className="cgp-select__chevron"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </Button>
      {description ? (
        <Text slot="description" className="cgp-select__description">
          {description}
        </Text>
      ) : null}
      {errorMessage ? (
        <span role="alert">
          <FieldError className="cgp-select__error">{errorMessage}</FieldError>
        </span>
      ) : null}
      <Popover className="cgp-select__popover">
        <ListBox className="cgp-select__listbox" items={itemList}>
          {(item) => (
            <ListBoxItem
              id={item.value}
              textValue={
                typeof item.label === "string" ? item.label : item.value
              }
              isDisabled={item.disabled}
              className={(states) =>
                cgpStateClassName("cgp-select__option", undefined, states)
              }
            >
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ReactAriaSelect>
  );
}
