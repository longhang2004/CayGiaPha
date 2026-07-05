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
        <Link href="/" className="app-nav__brand" aria-label="Cây Gia Phả">
          <img src="/logo.svg" alt="Logo Cây Gia Phả" style={{ height: "24px", width: "auto" }} />
        </Link>

        <div className="app-nav__actions">
          {loading ? (
            <div className="center-state__spinner" style={{ width: "1.25rem", height: "1.25rem", borderWidth: "2px" }} aria-label="Đang tải…" />
          ) : (
            <>
              {user ? (
                <>
                  <Link href="/tree" className="nav-link nav-link--primary">
                    Xem sơ đồ
                  </Link>
                  {user.role === "admin" && (
                    <Link href="/admin" className="nav-link nav-link--admin">
                      Admin
                    </Link>
                  )}
                  <NotificationBell />
                  <div className="app-nav__desktop-action">
                    <SignOutButton redirectTo="/" />
                  </div>
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
