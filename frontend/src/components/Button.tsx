import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
  loadingLabel?: ReactNode;
}

/**
 * Legacy compatibility boundary. Existing consumers keep the native DOM event
 * and style contract until their bounded migration task moves them to
 * CGPButton. New product code should use CGPButton directly.
 */
export function Button({
  children,
  type = "button",
  className,
  icon,
  loading = false,
  loadingLabel,
  disabled,
  ...rest
}: ButtonProps) {
  const classes = className ? `btn ${className}` : "btn";
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      {loading ? (loadingLabel ?? children) : children}
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
