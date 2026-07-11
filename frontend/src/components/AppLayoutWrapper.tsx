"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useSession } from "@/app/providers";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { MenuIcon } from "@/components/ui/Icons";

/**
 * Maps real app routes and their /prototype/* mirrors to the same chrome:
 * - bare: auth / invitation / legal (no header, no sidebar)
 * - marketing: landing home (Header only)
 * - in-app: everything else (Sidebar + mobile top bar)
 */
function layoutMode(pathname: string | null): "bare" | "marketing" | "inapp" {
  if (!pathname) return "inapp";

  // Strip trailing slash except root
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  // Prototype index is a dev discovery page — no app chrome
  if (path === "/prototype") return "bare";

  // Auth flows (real + prototype mirrors)
  if (
    path === "/signin" ||
    path === "/signup" ||
    path === "/login" ||
    path === "/forgot-password" ||
    path === "/prototype/signin" ||
    path === "/prototype/signup" ||
    path === "/prototype/forgot-password" ||
    path.startsWith("/signin/") ||
    path.startsWith("/signup/") ||
    path.startsWith("/forgot-password/") ||
    path.startsWith("/prototype/signin/") ||
    path.startsWith("/prototype/signup/") ||
    path.startsWith("/prototype/forgot-password/")
  ) {
    return "bare";
  }

  // Invitation accept (full-screen card; real + prototype)
  if (path.startsWith("/invitation/") || path.startsWith("/prototype/invitation/")) {
    return "bare";
  }

  // Legal
  if (path.startsWith("/legal/")) {
    return "bare";
  }

  // Landing and Help
  if (
    path === "/" ||
    path === "/prototype/home" ||
    path === "/help" ||
    path === "/prototype/help"
  ) {
    return "marketing";
  }

  return "inapp";
}

function isTreeWorkspacePath(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  // Real: /tree/[id]  Prototype: /prototype/tree and /prototype/tree/empty
  if (path.startsWith("/tree/") && path !== "/tree") return true;
  if (path === "/prototype/tree" || path.startsWith("/prototype/tree/")) return true;
  return false;
}

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });

  const handleToggleCollapse = () => {
    const nextState = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextState);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar_collapsed", String(nextState));
    }
  };

  const mode = layoutMode(pathname);

  if (mode === "bare") {
    return <div id="main-content">{children}</div>;
  }

  if (mode === "marketing") {
    return (
      <>
        <Header />
        <div id="main-content">{children}</div>
      </>
    );
  }

  // In-app experience: sidebar + mobile top bar
  const isTreeWorkspacePage = isTreeWorkspacePath(pathname);

  return (
    <div className="inapp-layout">
      <div className="mobile-top-bar" data-graph-safe-external="top">
        <button
          type="button"
          className="hamburger-btn"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          aria-label="Mở menu ứng dụng"
        >
          <MenuIcon size={20} />
        </button>
        <div style={{ display: "flex", alignItems: "center", marginRight: "1rem" }}>
          {user && <NotificationBell />}
        </div>
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div
        id="main-content"
        className={`inapp-content ${isSidebarCollapsed ? "inapp-content--collapsed" : ""} ${isTreeWorkspacePage ? "inapp-content--no-padding" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
