import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
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
  icon,
  ...rest
}: ButtonProps) {
  const classes = className ? `btn ${className}` : "btn";
  return (
    <button type={type} className={classes} {...rest}>
      {children}
      {icon && (
        <span
          className="btn-trailing-icon"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "2rem",
            height: "2rem",
            borderRadius: "9999px",
            backgroundColor: "rgba(255,255,255,0.15)",
            marginLeft: "0.5rem",
            transition: "all 0.5s var(--ease-spring)",
          }}
        >
          {icon}
        </span>
      )}
    </button>
  );
}
