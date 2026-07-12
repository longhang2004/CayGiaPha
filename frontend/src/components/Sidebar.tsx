"use client";

import { useSession } from "@/app/providers";
import {
  MenuIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FeedbackIcon,
  TreeIcon,
  InfoIcon,
  MoneyIcon,
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

  // Treat /prototype/* mirrors the same as real app routes for active states.
  const isTreeActive =
    pathname.startsWith("/tree") || pathname.startsWith("/prototype/tree");
  const isHelpActive =
    pathname.startsWith("/help") || pathname === "/prototype/help";
  const isSupportActive = pathname.startsWith("/support");
  const isFeedbackActive = pathname.startsWith("/feedback");
  const isAdminActive = pathname.startsWith("/admin");
  const isSettingsActive = pathname.startsWith("/settings");

  const pathParts = pathname.split("/");
  const activeTreeId =
    pathParts.length > 2 && pathParts[1] === "tree" ? pathParts[2] : null;
  const settingsHref = `/settings`;
  const isTreeListPath = pathname === "/tree" || pathname === "/prototype/tree";

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
        data-graph-safe-external="left"
      >
        <div className="global-sidebar__top">
          <div className="global-sidebar__brand-container">
            <Link
              href="/"
              className="global-sidebar__brand"
              onClick={onClose}
              aria-label="Cây Gia Phả"
              style={{
                display: isCollapsed ? "none" : "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <img src="/logo.svg" alt="Logo Cây Gia Phả" style={{ height: "24px", width: "auto" }} />
            </Link>
            <div className="global-sidebar__utility" style={{
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
              title={
                isCollapsed
                  ? isTreeListPath
                    ? "Danh sách cây"
                    : "Quay về danh sách"
                  : undefined
              }
            >
              <span className="global-sidebar__link-icon" aria-hidden="true">
                {isTreeListPath ? <TreeIcon size={18} /> : <ChevronLeftIcon size={18} />}
              </span>
              <span className="global-sidebar__link-text">
                {isTreeListPath ? "Danh sách cây" : "Quay về danh sách"}
              </span>
            </Link>
            <Link
              href="/help"
              className={`global-sidebar__link ${isHelpActive ? "global-sidebar__link--active" : ""}`}
              onClick={onClose}
              title={isCollapsed ? "Hướng dẫn sử dụng" : undefined}
            >
              <span className="global-sidebar__link-icon" aria-hidden="true"><InfoIcon size={18} /></span>
              <span className="global-sidebar__link-text">Hướng dẫn sử dụng</span>
            </Link>
            <Link
              href="/support"
              className={`global-sidebar__link global-sidebar__link--support ${isSupportActive ? "global-sidebar__link--active" : ""}`}
              onClick={onClose}
              title={isCollapsed ? "Ủng hộ" : undefined}
            >
              <span className="global-sidebar__link-icon" aria-hidden="true"><MoneyIcon size={18} /></span>
              <span className="global-sidebar__link-text">Ủng hộ</span>
            </Link>
            <Link
              href="/feedback"
              className={`global-sidebar__link ${isFeedbackActive ? "global-sidebar__link--active" : ""}`}
              onClick={onClose}
              title={isCollapsed ? "Feedback" : undefined}
            >
              <span className="global-sidebar__link-icon" aria-hidden="true"><FeedbackIcon size={18} /></span>
              <span className="global-sidebar__link-text">Feedback</span>
            </Link>

            {user && (
              <Link
                href={settingsHref}
                className={`global-sidebar__link ${isSettingsActive ? "global-sidebar__link--active" : ""}`}
                onClick={onClose}
                title={isCollapsed ? "Cài đặt" : undefined}
              >
                <span className="global-sidebar__link-icon" aria-hidden="true"><SettingsIcon size={18} /></span>
                <span className="global-sidebar__link-text">Cài đặt</span>
              </Link>
            )}
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className={`global-sidebar__link ${isAdminActive ? "global-sidebar__link--active" : ""}`}
                onClick={onClose}
                title={isCollapsed ? "Admin" : undefined}
              >
                <span className="global-sidebar__link-icon" aria-hidden="true"><SettingsIcon size={18} /></span>
                <span className="global-sidebar__link-text">Admin</span>
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
