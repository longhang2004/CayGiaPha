import { useEffect, useRef } from "react";
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
 * Enforces accessibility: focus trap, body scroll lock, and Escape key dismissal.
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
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Save previously focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Body scroll lock
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    // Escape key handling
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
      } else if (e.key === "Tab") {
        // Simple focus trap
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Initial focus
    if (modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      } else {
        modalRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = originalStyle;
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        tabIndex={-1}
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
