"use client";

import {
  Button,
  Dialog,
  DialogTrigger,
  Popover,
} from "react-aria-components";
import type { CGPPopoverProps } from "./contracts";

export function CGPPopover({
  isOpen,
  onOpenChange,
  trigger,
  triggerAriaLabel,
  triggerClassName,
  children,
  ariaLabel,
  placement = "bottom end",
  offset = 8,
  size = "md",
  className,
}: CGPPopoverProps) {
  const popoverClassName = [
    "cgp-popover",
    `cgp-popover--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button
        type="button"
        aria-label={triggerAriaLabel}
        className={triggerClassName}
      >
        {trigger}
      </Button>
      <Popover
        placement={placement}
        offset={offset}
        className={popoverClassName}
      >
        <Dialog
          aria-label={ariaLabel}
          className={`cgp-popover__dialog cgp-popover__dialog--${size}`}
        >
          {children}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
