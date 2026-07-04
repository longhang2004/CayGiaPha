import type { ReactNode } from "react";
import { CloseIcon } from "./Icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/**
 * Reusable Modal component encapsulating the overlay, aria roles, and layout.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  className = "",
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div
        className={`settings-modal ${className}`}
        style={style}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      >
        {children}
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  title: string;
  onClose?: () => void;
  titleId?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ModalHeader({ title, onClose, titleId, className = "", style }: ModalHeaderProps) {
  return (
    <div className={`settings-modal__header ${className}`} style={style}>
      <h2 id={titleId}>{title}</h2>
      {onClose && (
        <button
          type="button"
          className="settings-modal__close"
          onClick={onClose}
          aria-label="Đóng cửa sổ"
        >
          <CloseIcon size={24} />
        </button>
      )}
    </div>
  );
}

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ModalBody({ children, className = "", style }: ModalBodyProps) {
  return <div className={`settings-modal__body ${className}`} style={style}>{children}</div>;
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ModalFooter({ children, className = "", style }: ModalFooterProps) {
  return <div className={`settings-modal__footer ${className}`} style={style}>{children}</div>;
}
