"use client";

import { useSession } from "@/app/providers";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { HelpEntryPoint } from "@/components/help/HelpEntryPoint";
import { TextSizeControl } from "@/components/a11y/TextSizeControl";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { user, loading } = useSession();
  const pathname = usePathname();

  const isTreeActive = pathname.startsWith("/tree");
  const isHelpActive = pathname.startsWith("/help");

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && <div className="global-sidebar__overlay" onClick={onClose} aria-hidden="true" />}

      <aside
        className={`global-sidebar ${isOpen ? "global-sidebar--open" : ""} ${isCollapsed ? "global-sidebar--collapsed" : ""}`}
        aria-label="Menu ứng dụng"
      >
        <div className="global-sidebar__top">
          <div className="global-sidebar__brand-container">
            <Link href="/" className="global-sidebar__brand" onClick={onClose}>
              Cây Gia Phả
            </Link>
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
            >
              ☰
            </button>
          </div>

          <nav className="global-sidebar__nav" aria-label="Danh mục ứng dụng">
            <Link
              href="/tree"
              className={`global-sidebar__link ${isTreeActive ? "global-sidebar__link--active" : ""}`}
              onClick={onClose}
              title={isCollapsed ? "Sơ đồ gia phả" : undefined}
            >
              <span className="global-sidebar__link-icon" aria-hidden="true">🌳</span>
              <span className="global-sidebar__link-text">Sơ đồ gia phả</span>
            </Link>
            <Link
              href="/help"
              className={`global-sidebar__link ${isHelpActive ? "global-sidebar__link--active" : ""}`}
              onClick={onClose}
              title={isCollapsed ? "Hướng dẫn" : undefined}
            >
              <span className="global-sidebar__link-icon" aria-hidden="true">ℹ️</span>
              <span className="global-sidebar__link-text">Hướng dẫn</span>
            </Link>
          </nav>
        </div>

        <div className="global-sidebar__bottom">
          {/* Display Settings */}
          <div className="sidebar-settings">
            <h4 className="sidebar-settings__title">Cài đặt hiển thị</h4>
            <TextSizeControl />
          </div>

          {/* Help entry point (Trợ giúp) */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>Trợ giúp:</span>
            <HelpEntryPoint />
          </div>

          {/* User info & Signout */}
          {!loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {user ? (
                <>
                  <span className="global-sidebar__user" title={user.identifier}>
                    Đã đăng nhập: <strong>{user.identifier.length > 18 ? `${user.identifier.slice(0, 16)}…` : user.identifier}</strong>
                  </span>
                  <SignOutButton redirectTo="/" />
                </>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Link href="/signin" className="btn btn-secondary" style={{ flex: 1, textDecoration: "none", fontSize: "0.8125rem", padding: "0.5rem" }} onClick={onClose}>
                    Đăng nhập
                  </Link>
                  <Link href="/signup" className="btn" style={{ flex: 1, textDecoration: "none", fontSize: "0.8125rem", padding: "0.5rem" }} onClick={onClose}>
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
