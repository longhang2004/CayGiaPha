"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import Link from "next/link";
import { useSession } from "@/app/providers";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { MenuIcon } from "@/components/ui/Icons";

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

  const isAuthPage = pathname === "/signin" || pathname === "/signup" || pathname === "/prototype/signin" || pathname === "/prototype/signup";
  const isLegalPage = pathname.startsWith("/legal/");
  const isLandingPage = pathname === "/" || pathname === "/prototype/home";

  if (isAuthPage || isLegalPage) {
    return <div id="main-content">{children}</div>;
  }

  if (isLandingPage) {
    return (
      <>
        <Header />
        <div id="main-content">{children}</div>
      </>
    );
  }


  // In-app experience: sidebar + mobile top bar
  return (
    <div className="inapp-layout">
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
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

      {
        (() => {
          const isTreeWorkspacePage =
            (pathname.startsWith("/tree/") && pathname !== "/tree") ||
            pathname === "/prototype/tree";
          return (
            <div
              id="main-content"
              className={`inapp-content ${isSidebarCollapsed ? "inapp-content--collapsed" : ""} ${isTreeWorkspacePage ? "inapp-content--no-padding" : ""}`}
            >
              {children}
            </div>
          );
        })()
      }
    </div>
  );
}
