import type { ReactNode } from "react";

type BadgeVariant = "brand" | "success" | "danger" | "neutral" | "muted";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.2rem 0.6rem",
    borderRadius: "16px",
    fontSize: "0.75rem",
    fontWeight: 600,
    lineHeight: 1.2,
    whiteSpace: "nowrap" as const,
  };

  const variantStyles: Record<BadgeVariant, any> = {
    brand: {
      backgroundColor: "var(--color-brand)",
      color: "#fff",
    },
    success: {
      backgroundColor: "#10b981",
      color: "#fff",
    },
    danger: {
      backgroundColor: "var(--color-danger)",
      color: "#fff",
    },
    neutral: {
      backgroundColor: "var(--color-surface-hover)",
      color: "var(--color-fg)",
    },
    muted: {
      backgroundColor: "var(--color-hairline-soft)",
      color: "var(--color-muted)",
    },
  };

  return (
    <span className={`ui-badge ${className}`} style={{ ...baseStyle, ...variantStyles[variant] }}>
      {children}
    </span>
  );
}
