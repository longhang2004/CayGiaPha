import Link from "next/link";

export function LegalLinksCard() {
  return (
    <section className="surface-card settings-legal-card" aria-labelledby="settings-legal-title">
      <div>
        <h2 id="settings-legal-title">Pháp lý và quyền riêng tư</h2>
        <p>Đọc các điều khoản hiện hành và cách Cây Gia Phả xử lý dữ liệu của bạn.</p>
      </div>
      <div className="settings-legal-card__links">
        <Link href="/legal/tos">Điều khoản dịch vụ</Link>
        <Link href="/legal/privacy">Chính sách quyền riêng tư</Link>
      </div>
    </section>
  );
}
