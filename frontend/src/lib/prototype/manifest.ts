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
    href: "/prototype/tree-list",
    label: "🌿 Danh sách cây — hướng dẫn",
    description: "Tree list first-value checklist states",
  },
  {
    href: "/prototype/tree-list?welcome=open",
    label: "👋 Danh sách cây — truy cập sớm",
    description: "Early-access welcome dialog",
  },
  {
    href: "/prototype/tree",
    label: "🌳 Cây gia phả — Chủ cây",
    description: "Owner workspace with all content and administration capabilities",
  },
  {
    href: "/prototype/tree?role=contributor&person=ego",
    label: "✍️ Cây gia phả — Cộng tác viên",
    description: "Trusted content editor without tree administration",
  },
  {
    href: "/prototype/tree?role=linked&person=ego",
    label: "🪪 Cây gia phả — Thành viên đã xác nhận",
    description: "Own-node and own-photo actions without relationship editing",
  },
  {
    href: "/prototype/tree?role=reader&person=ego",
    label: "👁️ Cây gia phả — Người xem",
    description: "Projected read-only workspace",
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
    href: "/prototype/claim/example-person",
    label: "🪪 Xác nhận đây là tôi",
    description: "Signed-in claim verification bound to account identity",
  },
  {
    href: "/prototype/help",
    label: "❓ Hướng dẫn (Help)",
    description: "In-app help guide",
  },
  {
    href: "/prototype/settings",
    label: "⚙️ Cài đặt và quyền dữ liệu",
    description: "Profile, linked-node data rights, and account deletion",
  },
  {
    href: "/prototype/consent",
    label: "✅ Chấp thuận lại điều khoản",
    description: "Consent reacceptance dialog with canonical legal links",
  },
  {
    href: "/prototype/legal/tos",
    label: "📄 Điều khoản dịch vụ v2",
    description: "Canonical early-access terms",
  },
  {
    href: "/prototype/legal/privacy",
    label: "🔐 Chính sách quyền riêng tư v2",
    description: "Canonical early-access privacy policy",
  },
];
