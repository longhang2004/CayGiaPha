import { notFound } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Layout for the (prototype) route group.
 *
 * Guards: returns 404 in production so prototype routes are completely
 * unreachable outside of dev/local environments.
 *
 * NOTE: The real root layout (src/app/layout.tsx) already wraps children with
 * SessionProvider, TextSizeProvider, and AppLayoutWrapper. This layout only
 * needs to add the prototype banner — all other chrome is inherited.
 */
export default function PrototypeLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <>
      {/* Sticky prototype warning banner */}
      <div
        role="alert"
        aria-label="Chế độ prototype"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
          color: "#fff",
          textAlign: "center",
          padding: "0.375rem 1rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
          pointerEvents: "none",
        }}
      >
        ⚠️ PROTOTYPE — Chỉ môi trường dev · Dữ liệu giả · Không cần đăng nhập
      </div>
      {/* Push content below the banner */}
      <div style={{ paddingTop: "2rem" }}>{children}</div>
    </>
  );
}
