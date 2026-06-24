import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prototype Index — Cây Gia Phả",
};

/**
 * Prototype index page — lists all available prototype routes.
 *
 * This page exists so agents (e.g. Playwright tests, AI coding agents) can
 * auto-discover every prototype page without hard-coding paths.
 *
 * ⚠️  Dev/local only. Returns 404 in production.
 */
export default function PrototypeIndexPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const pages = [
    {
      href: "/prototype/home",
      label: "🏠 Trang chủ (Home)",
      description: "Landing page — logged-out and logged-in states",
    },
    {
      href: "/prototype/signin",
      label: "🔑 Đăng nhập — Bước 1 (Sign-in: identifier)",
      description: "IdentifierForm step of the sign-in flow",
    },
    {
      href: "/prototype/signin/otp",
      label: "🔑 Đăng nhập — Bước 2 (Sign-in: OTP)",
      description: "OtpForm step of the sign-in flow",
    },
    {
      href: "/prototype/signup",
      label: "✏️ Đăng ký — Bước 1 (Sign-up: identifier + TOS)",
      description: "Identifier + TOS step of the sign-up flow",
    },
    {
      href: "/prototype/signup/otp",
      label: "✏️ Đăng ký — Bước 2 (Sign-up: OTP)",
      description: "OTP verification step of the sign-up flow",
    },
    {
      href: "/prototype/tree",
      label: "🌳 Cây gia phả (Tree — populated)",
      description: "Full tree workspace with mock persons and relationships",
    },
    {
      href: "/prototype/tree?panel=settings",
      label: "🌳 Cây gia phả — Cài đặt (Tree — settings panel open)",
      description: "Tree workspace with the settings modal open",
    },
    {
      href: "/prototype/tree/empty",
      label: "🌱 Cây gia phả rỗng (Tree — empty / onboarding)",
      description: "Empty tree onboarding state — first member form",
    },
    {
      href: "/prototype/help",
      label: "❓ Hướng dẫn (Help)",
      description: "In-app help guide",
    },
  ];

  return (
    <section
      style={{
        maxWidth: "48rem",
        margin: "2rem auto",
        padding: "1.5rem",
      }}
    >
      <h1>Prototype Pages</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "2rem" }}>
        Mỗi trang dưới đây hiển thị giao diện thật với dữ liệu giả, không cần
        đăng nhập. Dùng cho Playwright và AI agents.
      </p>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {pages.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              style={{
                display: "block",
                padding: "1rem 1.25rem",
                borderRadius: "var(--radius-md, 0.5rem)",
                border: "1px solid var(--color-hairline, #e5e7eb)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                {page.label}
              </strong>
              <span
                style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}
              >
                {page.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
