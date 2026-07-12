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
  metadataBase: new URL("https://cay-gia-pha-six.vercel.app"),
  title: {
    default: "Cây Gia Phả | Tạo Sơ Đồ Dòng Họ & Xưng Hô Tự Động",
    template: "%s | Cây Gia Phả",
  },
  description:
    "Ứng dụng tạo cây gia phả, sơ đồ dòng họ trực tuyến cho người Việt. Tự động tính toán cách xưng hô (Bắc, Trung, Nam), mời cộng tác và lưu trữ kỷ niệm.",
  keywords: [
    "cây gia phả",
    "sơ đồ dòng họ",
    "gia phả trực tuyến",
    "cách xưng hô",
    "gia phả việt nam",
    "phả hệ",
    "family tree vietnamese"
  ],
  authors: [{ name: "Cây Gia Phả" }],
  creator: "Cây Gia Phả",
  publisher: "Cây Gia Phả",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://cay-gia-pha-six.vercel.app",
    title: "Cây Gia Phả | Tạo Sơ Đồ Dòng Họ & Xưng Hô Tự Động",
    description:
      "Ứng dụng tạo cây gia phả, sơ đồ dòng họ trực tuyến cho người Việt. Tự động tính toán cách xưng hô (Bắc, Trung, Nam), mời cộng tác và lưu trữ kỷ niệm.",
    siteName: "Cây Gia Phả",
    images: [
      {
        url: "/hero.png",
        width: 1200,
        height: 630,
        alt: "Cây Gia Phả - Giao diện chính",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cây Gia Phả | Tạo Sơ Đồ Dòng Họ & Xưng Hô Tự Động",
    description:
      "Ứng dụng tạo cây gia phả trực tuyến cho người Việt. Tự động tính cách xưng hô, mời cộng tác và lưu trữ kỷ niệm.",
    images: ["/hero.png"],
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Cây Gia Phả",
              "url": "https://cay-gia-pha-six.vercel.app",
              "description": "Ứng dụng tạo cây gia phả, sơ đồ dòng họ trực tuyến cho người Việt. Tự động tính toán cách xưng hô.",
              "inLanguage": "vi",
            })
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
