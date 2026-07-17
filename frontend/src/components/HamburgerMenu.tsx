"use client";

import { useEffect, useState } from "react";
import { TextSizeControl } from "@/components/a11y/TextSizeControl";
import { CGPPopover } from "@/components/cgp";
import { FeedbackIcon, MenuIcon, MoneyIcon } from "@/components/ui/Icons";
import Link from "next/link";

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

    setIsDark(storedTheme === "dark" || (storedTheme !== "light" && systemPrefersDark));
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    const root = document.documentElement;

    window.localStorage.setItem("theme", nextIsDark ? "dark" : "light");
    root.classList.toggle("dark", nextIsDark);
    root.classList.toggle("light", !nextIsDark);
    setIsDark(nextIsDark);
  };

  return (
    <div className="hamburger-menu">
      <CGPPopover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        trigger={<MenuIcon size={20} />}
        triggerAriaLabel="Cài đặt hiển thị và Trợ giúp"
        triggerClassName="btn btn-secondary hamburger-btn"
        ariaLabel="Menu cài đặt"
        placement="bottom end"
        size="md"
        className="hamburger-menu__popover"
      >
        <div className="hamburger-menu__dropdown">
          <div className="hamburger-menu__section hamburger-menu__marketing">
            <h3 className="hamburger-menu__heading">Khám phá</h3>
            <div className="hamburger-menu__links">
              <Link href="/#cach-hoat-dong" className="hamburger-menu__link" onClick={() => setIsOpen(false)}>
                Cách hoạt động
              </Link>
              <Link href="/#tinh-nang" className="hamburger-menu__link" onClick={() => setIsOpen(false)}>
                Tính năng
              </Link>
              <Link href="/#rieng-tu" className="hamburger-menu__link" onClick={() => setIsOpen(false)}>
                Riêng tư
              </Link>
              <Link href="/help" className="hamburger-menu__link" onClick={() => setIsOpen(false)}>
                Hướng dẫn sử dụng
              </Link>
            </div>
          </div>
          <div className="hamburger-menu__section">
            <h3 className="hamburger-menu__heading">Cài đặt hiển thị</h3>
            <div className="theme-toggle">
              <span className="theme-toggle__label" aria-hidden="true">
                Giao diện tối
              </span>
              <button
                type="button"
                className="theme-toggle__control"
                role="switch"
                aria-checked={isDark}
                aria-label="Giao diện tối"
                onClick={toggleTheme}
              >
                <span className="theme-toggle__thumb" aria-hidden="true" />
              </button>
            </div>
            <TextSizeControl />
          </div>
          <div>
            <h3 className="hamburger-menu__heading">Hỗ trợ</h3>
            <div className="hamburger-menu__links">
              <Link
                href="/support"
                className="hamburger-menu__link hamburger-menu__link--support"
                onClick={() => setIsOpen(false)}
              >
                <MoneyIcon size={18} />
                <span>Ủng hộ</span>
              </Link>
              <Link
                href="/feedback"
                className="hamburger-menu__link"
                onClick={() => setIsOpen(false)}
              >
                <FeedbackIcon size={18} />
                <span>Feedback</span>
              </Link>
            </div>
          </div>
        </div>
      </CGPPopover>
    </div>
  );
}
