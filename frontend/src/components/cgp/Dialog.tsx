"use client";

import { useEffect, useId, useRef } from "react";
import {
  Dialog as ReactAriaDialog,
  Heading,
  Modal,
  ModalOverlay,
  Text,
} from "react-aria-components";
import type { CGPDialogProps } from "./contracts";
import { CGPIconButton } from "./Button";

const DEFAULT_DISMISS_POLICY = {
  escape: true,
  outsidePress: true,
} as const;

export function CGPDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissPolicy = DEFAULT_DISMISS_POLICY,
  initialFocusRef,
  className,
}: CGPDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const descriptionId = useId();

  useEffect(() => {
    if (isOpen && initialFocusRef?.current) {
      initialFocusRef.current.focus();
    }
  }, [initialFocusRef, isOpen]);

  // RAC 1.19 filters aria-modal from Dialog DOM props. Modal still supplies
  // the modal interaction behavior; restore the programmatic modal state.
  useEffect(() => {
    if (isOpen) dialogRef.current?.setAttribute("aria-modal", "true");
  }, [isOpen]);

  const dialogClassName = [
    "cgp-dialog",
    `cgp-dialog--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!nextIsOpen) onOpenChange(false);
      }}
      isDismissable={dismissPolicy.outsidePress}
      isKeyboardDismissDisabled={!dismissPolicy.escape}
      className="cgp-dialog-overlay"
    >
      <Modal className={`cgp-dialog-modal cgp-dialog-modal--${size}`}>
        <ReactAriaDialog
          ref={dialogRef}
          className={dialogClassName}
          aria-describedby={description ? descriptionId : undefined}
        >
          <header className="cgp-dialog__header">
            <Heading slot="title" className="cgp-dialog__title">
              {title}
            </Heading>
            <CGPIconButton
              type="button"
              variant="quiet"
              size="sm"
              className="cgp-dialog__close"
              aria-label="Đóng cửa sổ"
              onPress={() => onOpenChange(false)}
            >
              <span aria-hidden="true">×</span>
            </CGPIconButton>
          </header>
          {description ? (
            <Text
              id={descriptionId}
              slot="description"
              className="cgp-dialog__description"
            >
              {description}
            </Text>
          ) : null}
          <div className="cgp-dialog__body">{children}</div>
          {footer ? <footer className="cgp-dialog__footer">{footer}</footer> : null}
        </ReactAriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
