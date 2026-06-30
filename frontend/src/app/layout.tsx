import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SessionProvider } from "./providers";
import { TextSizeProvider } from "@/components/a11y/TextSizeProvider";
import { AppLayoutWrapper } from "@/components/AppLayoutWrapper";

export const metadata: Metadata = {
  title: "Cây Gia Phả",
  description:
    "Vietnamese family tree with automatic form-of-address (cách xưng hô) computation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (theme === 'light') {
                  document.documentElement.classList.add('light');
                }
              })();
            `
          }}
        />
      </head>
      <body>
        <TextSizeProvider>
          <SessionProvider>
            <a href="#main-content" className="skip-link">
              Bỏ qua tới nội dung chính
            </a>
            <AppLayoutWrapper>{children}</AppLayoutWrapper>
          </SessionProvider>
        </TextSizeProvider>
      </body>
    </html>
  );
}
