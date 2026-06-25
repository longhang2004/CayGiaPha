"use client";

import { useSession } from "@/app/providers";
import { HelpEntryPoint } from "@/components/help/HelpEntryPoint";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/ui/NotificationBell";

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
            <Link href="/" className="global-sidebar__brand" onClick={onClose} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <img src="/logo.png" alt="Logo Cây Gia Phả" style={{ height: "24px", width: "auto" }} />
              {!isCollapsed && <span>Cây Gia Phả</span>}
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {user && <NotificationBell />}
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={onToggleCollapse}
                aria-label={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
              >
                ☰
              </button>
            </div>
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
            {user && (
              <Link
                href="/tree?settings=true"
                className="global-sidebar__link"
                onClick={onClose}
                title={isCollapsed ? "Cài đặt" : undefined}
              >
                <span className="global-sidebar__link-icon" aria-hidden="true">⚙️</span>
                <span className="global-sidebar__link-text">Cài đặt</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="global-sidebar__bottom">
          {/* Help entry point (Trợ giúp) */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>Trợ giúp:</span>
            <HelpEntryPoint />
          </div>

          {/* Login/Signup for anonymous users */}
          {!loading && !user && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link href="/signin" className="btn btn-secondary" style={{ flex: 1, textDecoration: "none", fontSize: "0.8125rem", padding: "0.5rem" }} onClick={onClose}>
                  Đăng nhập
                </Link>
                <Link href="/signup" className="btn" style={{ flex: 1, textDecoration: "none", fontSize: "0.8125rem", padding: "0.5rem" }} onClick={onClose}>
                  Đăng ký
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
