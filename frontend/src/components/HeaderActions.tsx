"use client";

import Link from "next/link";
import { useSession } from "@/app/providers";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { HelpEntryPoint } from "@/components/help/HelpEntryPoint";
import { TextSizeControl } from "@/components/a11y/TextSizeControl";

export function HeaderActions() {
  const { user, loading } = useSession();

  return (
    <div className="app-nav__actions" style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
      <TextSizeControl />
      <HelpEntryPoint />
      
      {!loading && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {user ? (
            <>
              <Link href="/tree" className="nav-link">
                Xem sơ đồ
              </Link>
              <span className="user-email text-muted" title={user.identifier}>
                {user.identifier.length > 20
                  ? `${user.identifier.slice(0, 18)}…`
                  : user.identifier}
              </span>
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
        </div>
      )}
    </div>
  );
}
