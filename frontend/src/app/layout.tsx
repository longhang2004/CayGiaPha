import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../styles/globals.scss";
import { SessionProvider } from "./providers";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { TextSizeProvider } from "@/components/a11y/TextSizeProvider";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppLayoutWrapper } from "@/components/AppLayoutWrapper";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cây Gia Phả",
  description:
    "Vietnamese family tree with automatic form-of-address (cách xưng hô) computation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={plusJakarta.variable}>
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
        <ToastProvider>
          <ConfirmProvider>
            <TextSizeProvider>
              <SessionProvider>
                <a href="#main-content" className="skip-link">
                  Bỏ qua tới nội dung chính
                </a>
                <AppLayoutWrapper>{children}</AppLayoutWrapper>
              </SessionProvider>
            </TextSizeProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
