"use client";

import Link from "next/link";
import { useSession } from "@/app/providers";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { HamburgerMenu } from "@/components/HamburgerMenu";

export function Header() {
  const { user, loading } = useSession();

  return (
    <header className="app-header app-header--sticky">
      <nav className="app-nav" aria-label="Điều hướng chính">
        <Link href="/" className="app-nav__brand">
          Cây Gia Phả
        </Link>

        <div className="app-nav__actions" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {!loading && (
            <>
              {user ? (
                <>
                  <Link href="/tree" className="nav-link" style={{ fontWeight: 600 }}>
                    Xem sơ đồ
                  </Link>
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
