import type { ReactNode, RefObject } from "react";
import type {
  ButtonProps,
  CheckboxProps,
  SelectProps,
  TextFieldProps,
} from "react-aria-components";

export const CGP_COMPONENT_CONTRACT_VERSION = "phase-0-v1" as const;
export const CGP_OVERLAY_ROOT_ID = "cgp-overlay-root" as const;

// react-aria-components@1.19.0 still exports its Toast primitives as UNSTABLE_*.
// CGP therefore owns the public toast contract until a later approved phase
// explicitly validates and adopts a stable kernel API.
export const CGP_TOAST_KERNEL_STATUS = "cgp-owned-until-rac-stable" as const;

export type CGPButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "quiet"
  | "link";

export type CGPComponentSize = "sm" | "md" | "lg";

export interface CGPButtonProps
  extends Omit<ButtonProps, "children" | "className" | "style" | "isPending"> {
  children: ReactNode;
  variant?: CGPButtonVariant;
  size?: CGPComponentSize;
  loading?: boolean;
  loadingLabel?: ReactNode;
  className?: string;
}

export interface CGPIconButtonProps extends Omit<CGPButtonProps, "children"> {
  "aria-label": string;
  children: ReactNode;
}

interface CGPFieldContentProps {
  label: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode;
  className?: string;
}

export interface CGPTextFieldProps
  extends Omit<TextFieldProps, "children" | "className" | "style">,
    CGPFieldContentProps {
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  placeholder?: string;
}

export interface CGPPasswordFieldProps extends Omit<CGPTextFieldProps, "type"> {
  revealLabel?: string;
  concealLabel?: string;
}

export interface CGPSelectItem {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface CGPSelectProps
  extends Omit<SelectProps<CGPSelectItem>, "children" | "className" | "style">,
    CGPFieldContentProps {
  items: Iterable<CGPSelectItem>;
  placeholder?: string;
}

export interface CGPCheckboxProps
  extends Omit<CheckboxProps, "children" | "className" | "style"> {
  children: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode;
  className?: string;
}

export interface CGPDialogDismissPolicy {
  escape: boolean;
  outsidePress: boolean;
}

export interface CGPDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: CGPComponentSize | "fullscreen-mobile";
  dismissPolicy?: CGPDialogDismissPolicy;
  initialFocusRef?: RefObject<HTMLElement>;
  portalOwner?: "application";
  className?: string;
}

export interface CGPToastAction {
  label: string;
  onAction: () => void;
  closeOnAction?: boolean;
}

export interface CGPToastOptions {
  tone?: "neutral" | "success" | "error" | "info";
  timeout?: number | null;
  action?: CGPToastAction;
}

export interface CGPToastApi {
  show: (message: string, options?: CGPToastOptions) => () => void;
}
