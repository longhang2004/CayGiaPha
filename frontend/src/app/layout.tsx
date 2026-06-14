import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SessionProvider } from "./providers";
import { TextSizeProvider } from "@/components/a11y/TextSizeProvider";
import { HeaderActions } from "@/components/HeaderActions";

export const metadata: Metadata = {
  title: "Cây Gia Phả",
  description:
    "Vietnamese family tree with automatic form-of-address (cách xưng hô) computation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <TextSizeProvider>
          <SessionProvider>
            <a href="#main-content" className="skip-link">
              Bỏ qua tới nội dung chính
            </a>
            <header className="app-header">
              <nav className="app-nav" aria-label="Điều hướng chính">
                <a href="/" className="app-nav__brand">
                  Cây Gia Phả
                </a>
                <HeaderActions />
              </nav>
            </header>
            <main id="main-content">{children}</main>
          </SessionProvider>
        </TextSizeProvider>
      </body>
    </html>
  );
}
