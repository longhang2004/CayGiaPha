"use client";

import { useState, useRef, useEffect } from "react";
import { TextSizeControl } from "@/components/a11y/TextSizeControl";
import { HelpEntryPoint } from "@/components/help/HelpEntryPoint";
import { MenuIcon } from "@/components/ui/Icons";
import { Card } from "@/components/ui/Card";

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="hamburger-menu" ref={menuRef}>
      <button
        type="button"
        className="btn btn-secondary hamburger-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Cài đặt hiển thị và Trợ giúp"
        aria-expanded={isOpen}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.25rem",
          padding: "0.5rem 0.75rem",
          minHeight: "44px",
          minWidth: "44px",
          borderRadius: "8px",
        }}
      >
        <MenuIcon size={20} />
      </button>

      {isOpen && (
        <Card className="hamburger-menu__dropdown" role="dialog" aria-label="Menu cài đặt">
          <div style={{ borderBottom: "1px solid var(--color-hairline-soft)", paddingBottom: "1rem", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, margin: "0 0 0.5rem" }}>Cài đặt hiển thị</h3>
            <TextSizeControl />
          </div>
          <div>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, margin: "0 0 0.5rem" }}>Hỗ trợ</h3>
            <HelpEntryPoint />
          </div>
        </Card>
      )}
    </div>
  );
}
