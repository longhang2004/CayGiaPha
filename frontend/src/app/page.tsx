"use client";

import Link from "next/link";
import { useSession } from "@/app/providers";

export default function HomePage() {
  const { user, loading } = useSession();

  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero__content">
        <p className="eyebrow">Gia phả Việt, dễ dùng cho cả dòng họ</p>
        <h1 id="home-title">Cây Gia Phả</h1>
        <p className="home-hero__lead">
          Xây dựng và trực quan hóa gia phả của dòng họ, với cách xưng hô tiếng
          Việt được tính tự động theo bên nội/ngoại, giới tính, vai vế và vùng
          miền.
        </p>

        <div className="home-hero__actions" aria-busy={loading}>
          {loading ? (
            <span className="btn btn-secondary home-hero__loading">Đang kiểm tra phiên đăng nhập…</span>
          ) : user ? (
            <Link href="/tree" className="btn">
              Mở cây gia phả
            </Link>
          ) : (
            <>
              <Link href="/signup" className="btn">
                Đăng ký ngay
              </Link>
              <Link href="/signin" className="btn btn-secondary">
                Đăng nhập
              </Link>
            </>
          )}
        </div>
      </div>

      <aside className="home-hero__card" aria-label="Tính năng chính" style={{ padding: 0, overflow: "hidden" }}>
        <img
          src="/hero.png"
          alt="Minh họa Cây Gia Phả"
          style={{ width: "100%", height: "220px", objectFit: "cover", borderBottom: "1px solid var(--color-hairline)" }}
        />
        <div style={{ padding: "1.5rem" }}>
          <div>
            <span className="home-hero__stat" style={{ fontSize: "1.75rem", fontWeight: 700 }}>Trực quan & Tiện lợi</span>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "var(--color-muted)" }}>
              Thêm thành viên, nối quan hệ, tự động tính xưng hô theo vùng miền.
            </p>
          </div>
          <div className="home-feature-grid" style={{ marginTop: "1rem" }}>
            <span style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem", display: "inline-block" }}>🛡️ Bảo vệ thông tin người còn sống</span>
            <span style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem", display: "inline-block" }}>🔗 Chia sẻ bằng liên kết riêng</span>
            <span style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem", display: "inline-block" }}>🔍 Tìm kiếm nhanh trong cây</span>
          </div>
        </div>
      </aside>

      <div className="home-steps" aria-label="Hướng dẫn bắt đầu nhanh">
        <article>
          <span>1</span>
          <h2>Tạo thành viên đầu tiên</h2>
          <p>Bắt đầu từ chính bạn hoặc người lớn tuổi nhất mà gia đình cùng biết.</p>
        </article>
        <article>
          <span>2</span>
          <h2>Nối quan hệ cốt lõi</h2>
          <p>Thêm cha mẹ, vợ chồng và con cái trước; các vai vế phức tạp sẽ được suy ra.</p>
        </article>
        <article>
          <span>3</span>
          <h2>Chọn góc nhìn</h2>
          <p>Đổi người làm mốc để xem cách xưng hô phù hợp theo vùng miền.</p>
        </article>
      </div>
    </section>
  );
}
