import { useState, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { ErrorIcon } from "./Icons";

interface FormControlProps {
  label: string;
  error?: string;
  id?: string;
  children: ReactNode;
  required?: boolean;
}

export function FormControl({ label, error, id, children, required }: FormControlProps) {
  return (
    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1rem" }}>
      <label htmlFor={id} style={{ fontWeight: 600, fontSize: "0.95rem" }}>
        {label}
        {required && <span style={{ color: "var(--color-danger)", marginLeft: "0.25rem" }}>*</span>}
      </label>
      {children}
      {error && (
        <span id={`${id}-error`} role="alert" style={{ color: "var(--color-danger)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}>
          <ErrorIcon size={14} />
          {error}
        </span>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, className = "", style, type = "text", ...rest }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const currentType = isPassword ? (showPassword ? "text" : "password") : type;

  const baseStyle = {
    padding: "0.75rem 1rem",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    backgroundColor: "transparent",
    color: "var(--color-fg)",
    width: "100%",
    boxShadow: "var(--shadow-inner)",
    outline: "none",
  };

  return (
    <div
      style={{
        padding: "4px",
        borderRadius: "16px",
        backgroundColor: "rgba(0,0,0,0.02)",
        border: `1px solid ${error ? "var(--color-danger)" : "var(--color-hairline)"}`,
        transition: "all 0.3s var(--ease-spring)",
        position: "relative",
      }}
      className="double-bezel-wrapper"
    >
      <input
        className={`ui-input ${className}`}
        style={{ ...baseStyle, ...style, paddingRight: isPassword ? "2.5rem" : "1rem" }}
        type={currentType}
        aria-invalid={!!error}
        aria-describedby={error && rest.id ? `${rest.id}-error` : undefined}
        {...rest}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            color: "var(--color-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {showPassword ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export function Select({ error, className = "", style, children, ...rest }: SelectProps) {
  const baseStyle = {
    padding: "0.75rem 1rem",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    backgroundColor: "var(--color-surface-card)",
    color: "var(--color-fg)",
    width: "100%",
    boxShadow: "var(--shadow-inner)",
    outline: "none",
  };

  return (
    <div
      style={{
        padding: "4px",
        borderRadius: "16px",
        backgroundColor: "rgba(0,0,0,0.02)",
        border: `1px solid ${error ? "var(--color-danger)" : "var(--color-hairline)"}`,
        transition: "all 0.3s var(--ease-spring)",
      }}
      className="double-bezel-wrapper"
    >
      <select
        className={`ui-select ${className}`}
        style={{ ...baseStyle, ...style }}
        aria-invalid={!!error}
        aria-describedby={error && rest.id ? `${rest.id}-error` : undefined}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
