"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import Link from "next/link";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

  const isAuthPage = pathname === "/signin" || pathname === "/signup";
  const isLandingPage = pathname === "/";
  const showHeader = isLandingPage || isAuthPage;

  if (showHeader) {
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
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Mở menu ứng dụng"
        >
          ☰
        </button>
        <Link href="/" className="mobile-top-bar__brand">
          Cây Gia Phả
        </Link>
        <div style={{ width: "32px" }} /> {/* spacer to center brand title */}
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div
        id="main-content"
        className={`inapp-content ${isSidebarCollapsed ? "inapp-content--collapsed" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
