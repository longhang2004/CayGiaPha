import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/**
 * Minimal accessible button used across the app. Renders a semantic
 * `<button>` so its name (from children), role, and state (e.g. `disabled`,
 * `aria-pressed`) are programmatically determinable (Requirement 18.5) and it
 * is keyboard-operable by default (18.6). The ≥44×44 CSS-px touch target and
 * focus styles are enforced app-wide in globals.css (18.4, 18.6).
 *
 * Any `className` is merged after the base `btn` class so callers can extend
 * styling without losing the accessible defaults.
 */
export function Button({
  children,
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  const classes = className ? `btn ${className}` : "btn";
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
