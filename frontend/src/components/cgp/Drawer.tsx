"use client";

import { useEffect, useRef } from "react";
import {
  Dialog,
  Modal,
  ModalOverlay,
} from "react-aria-components";
import type { CGPDrawerProps } from "./contracts";
import { CGPIconButton } from "./Button";
import { CloseIcon } from "@/components/ui/Icons";

const DEFAULT_DISMISS_POLICY = {
  escape: true,
  outsidePress: true,
} as const;

export function CGPDrawer(props: CGPDrawerProps) {
  const placement = props.placement ?? "left";
  const drawerClassName = [
    "cgp-drawer",
    `cgp-drawer--${placement}`,
    `cgp-drawer--${props.presentation}`,
    props.className,
  ]
    .filter(Boolean)
    .join(" ");

  if (props.presentation === "persistent") {
    return (
      <aside
        id={props.id}
        aria-label={props.label}
        className={drawerClassName}
        data-graph-safe-external={props.safeAreaEdge}
      >
        {props.children}
      </aside>
    );
  }

  return <ModalCGPDrawer {...props} drawerClassName={drawerClassName} />;
}

function ModalCGPDrawer(
  props: Extract<CGPDrawerProps, { presentation: "modal" }> & {
    drawerClassName: string;
  },
) {
  const dialogRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);
  const dismissPolicy = props.dismissPolicy ?? DEFAULT_DISMISS_POLICY;

  useEffect(() => {
    if (props.isOpen) {
      dialogRef.current?.setAttribute("aria-modal", "true");
      props.initialFocusRef?.current?.focus();
    }
  }, [props.initialFocusRef, props.isOpen]);

  useEffect(() => {
    if (wasOpenRef.current && !props.isOpen) {
      props.returnFocusRef?.current?.focus();
    }
    wasOpenRef.current = props.isOpen;
  }, [props.isOpen, props.returnFocusRef]);

  return (
    <ModalOverlay
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      isDismissable={dismissPolicy.outsidePress}
      isKeyboardDismissDisabled={!dismissPolicy.escape}
      className="cgp-drawer-overlay global-sidebar__overlay"
    >
      <Modal className={`cgp-drawer-modal cgp-drawer-modal--${props.placement ?? "left"}`}>
        <Dialog
          id={props.id}
          ref={dialogRef}
          aria-label={props.label}
          className={props.drawerClassName}
          data-graph-safe-external={props.safeAreaEdge}
        >
          <CGPIconButton
            aria-label={props.closeLabel ?? `Đóng ${props.label.toLocaleLowerCase("vi")}`}
            className="cgp-drawer__close"
            onPress={() => props.onOpenChange(false)}
            size="sm"
            variant="quiet"
          >
            <CloseIcon size={20} />
          </CGPIconButton>
          {props.children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
