"use client";

import { useState } from "react";
import { TextSizeControl } from "@/components/a11y/TextSizeControl";
import { HelpEntryPoint } from "@/components/help/HelpEntryPoint";
import { CGPPopover } from "@/components/cgp";
import { FeedbackIcon, MenuIcon, MoneyIcon } from "@/components/ui/Icons";
import Link from "next/link";

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

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
          <div className="hamburger-menu__section">
            <h3 className="hamburger-menu__heading">Cài đặt hiển thị</h3>
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
              <HelpEntryPoint />
            </div>
          </div>
        </div>
      </CGPPopover>
    </div>
  );
}
