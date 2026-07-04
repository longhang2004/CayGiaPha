import type { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Reusable Card component for layout surfaces.
 */
export function Card({ children, className = "", style, ...rest }: CardProps) {
  return (
    <div
      className={`ui-card ${className}`}
      style={{
        backgroundColor: "var(--color-surface-card)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "8px",
        padding: "1rem",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
