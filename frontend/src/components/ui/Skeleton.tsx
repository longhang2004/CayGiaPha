import type { CSSProperties } from "react";

export interface SkeletonProps {
  variant?: "text" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
  style,
}: SkeletonProps) {
  const inlineStyle: CSSProperties = {
    width: width !== undefined ? (typeof width === "number" ? `${width}px` : width) : undefined,
    height: height !== undefined ? (typeof height === "number" ? `${height}px` : height) : undefined,
    ...style,
  };

  return (
    <div
      className={`skeleton skeleton--${variant} ${className}`}
      style={inlineStyle}
      role="presentation"
      aria-hidden="true"
    />
  );
}
