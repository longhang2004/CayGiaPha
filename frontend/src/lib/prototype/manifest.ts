export interface PrototypePage {
  href: string;
  label: string;
  description: string;
}

export const PROTOTYPE_PAGES: PrototypePage[] = [
  {
    href: "/prototype/home",
    label: "🏠 Trang chủ (Home)",
    description: "Landing page — logged-out and logged-in states",
  },
  {
    href: "/prototype/signin",
    label: "🔑 Đăng nhập",
    description: "Sign-in flow",
  },
  {
    href: "/prototype/signup",
    label: "✏️ Đăng ký",
    description: "Sign-up flow",
  },
  {
    href: "/prototype/forgot-password",
    label: "🔐 Quên mật khẩu",
    description: "Password recovery flow",
  },
  {
    href: "/prototype/tree",
    label: "🌳 Cây gia phả (Tree — populated)",
    description: "Full tree workspace with mock persons and relationships",
  },
  {
    href: "/prototype/tree?panel=settings",
    label: "🌳 Cây gia phả — Cài đặt (Tree — settings)",
    description: "Tree workspace with the settings modal open",
  },
  {
    href: "/prototype/tree/empty",
    label: "🌱 Cây gia phả rỗng (Tree — empty)",
    description: "Empty tree onboarding state",
  },
  {
    href: "/prototype/invitation/test-invite-123",
    label: "💌 Thư mời (Invitation)",
    description: "Invitation acceptance flow",
  },
  {
    href: "/prototype/help",
    label: "❓ Hướng dẫn (Help)",
    description: "In-app help guide",
  },
];
