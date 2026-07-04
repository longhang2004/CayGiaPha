"use client";

import { useSession } from "@/app/providers";
import { HelpEntryPoint } from "@/components/help/HelpEntryPoint";
import {
  MenuIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TreeIcon,
  InfoIcon,
  SettingsIcon,
} from "@/components/ui/Icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { SignOutButton } from "@/components/auth/SignOutButton";

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

  const pathParts = pathname.split("/");
  const activeTreeId = (pathParts.length > 2 && pathParts[1] === "tree") ? pathParts[2] : null;
  const settingsHref = `/settings`;

  // On mobile the sidebar is an open drawer (isOpen=true). In that mode the
  // toggle button closes the drawer rather than collapsing it to icon-only
  // width (which is a desktop-only concept).
  const handleToggleBtn = isOpen ? onClose : onToggleCollapse;
  const toggleLabel = isOpen
    ? "Đóng menu"
    : isCollapsed
    ? "Mở rộng menu"
    : "Thu gọn menu";

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
            <Link
              href="/"
              className="global-sidebar__brand"
              onClick={onClose}
              style={{
                display: isCollapsed ? "none" : "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <img src="/logo.svg" alt="Logo Cây Gia Phả" style={{ height: "24px", width: "auto" }} />
              {!isCollapsed && <span>Cây Gia Phả</span>}
            </Link>
            <div style={{
              display: "flex",
              flexDirection: isCollapsed ? "column" : "row",
              alignItems: "center",
              gap: isCollapsed ? "0.75rem" : "0.5rem"
            }}>
              {user && <NotificationBell align="left" />}
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={handleToggleBtn}
                aria-label={toggleLabel}
              >
                {isOpen ? (
                  <CloseIcon size={18} />
                ) : isCollapsed ? (
                  <ChevronRightIcon size={18} />
                ) : (
                  <ChevronLeftIcon size={18} />
                )}
              </button>
            </div>
          </div>

          <nav className="global-sidebar__nav" aria-label="Danh mục ứng dụng">
            <Link
              href="/tree"
              className={`global-sidebar__link ${isTreeActive ? "global-sidebar__link--active" : ""}`}
              onClick={onClose}
              title={isCollapsed ? (pathname === "/tree" ? "Danh sách cây" : "Quay về danh sách") : undefined}
            >
              <span className="global-sidebar__link-icon" aria-hidden="true">
                {pathname === "/tree" ? (
                  <TreeIcon size={18} />
                ) : (
                  <ChevronLeftIcon size={18} />
                )}
              </span>
              <span className="global-sidebar__link-text">
                {pathname === "/tree" ? "Danh sách cây" : "Quay về danh sách"}
              </span>
            </Link>
            <Link
              href="/help"
              className={`global-sidebar__link ${isHelpActive ? "global-sidebar__link--active" : ""}`}
              onClick={onClose}
              title={isCollapsed ? "Trợ giúp" : undefined}
            >
              <span className="global-sidebar__link-icon" aria-hidden="true"><InfoIcon size={18} /></span>
              <span className="global-sidebar__link-text">Trợ giúp</span>
            </Link>

            {user && (
              <Link
                href={settingsHref}
                className="global-sidebar__link"
                onClick={onClose}
                title={isCollapsed ? "Cài đặt" : undefined}
              >
                <span className="global-sidebar__link-icon" aria-hidden="true"><SettingsIcon size={18} /></span>
                <span className="global-sidebar__link-text">Cài đặt</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="global-sidebar__bottom">
          {/* Help entry point (Trợ giúp) hidden since it's now in main nav, or maybe remove entirely */}

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

          {/* SignOut for authenticated users */}
          {!loading && user && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column" }}>
              <SignOutButton />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
