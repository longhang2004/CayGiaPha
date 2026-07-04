"use client";

import Link from "next/link";
import { useSession } from "@/app/providers";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { NotificationBell } from "@/components/ui/NotificationBell";

export function Header() {
  const { user, loading } = useSession();

  return (
    <header className="app-header app-header--sticky">
      <nav className="app-nav" aria-label="Điều hướng chính">
        <Link href="/" className="app-nav__brand" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/logo.svg" alt="Logo Cây Gia Phả" style={{ height: "24px", width: "auto" }} />
          <span>Cây Gia Phả</span>
        </Link>

        <div className="app-nav__actions" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {loading ? (
            <div className="center-state__spinner" style={{ width: "1.25rem", height: "1.25rem", borderWidth: "2px" }} aria-label="Đang tải…" />
          ) : (
            <>
              {user ? (
                <>
                  <Link href="/tree" className="nav-link" style={{ fontWeight: 600 }}>
                    Xem sơ đồ
                  </Link>
                  <NotificationBell />
                  <SignOutButton redirectTo="/" />
                </>
              ) : (
                <>
                  <Link href="/signin" className="btn btn-secondary" style={{ textDecoration: "none" }}>
                    Đăng nhập
                  </Link>
                  <Link href="/signup" className="btn" style={{ textDecoration: "none" }}>
                    Đăng ký
                  </Link>
                </>
              )}
            </>
          )}
          <HamburgerMenu />
        </div>
      </nav>
    </header>
  );
}
