"use client";

import Link from "next/link";
import { useSession } from "@/app/providers";

export default function HomePage() {
  const { user, loading } = useSession();

  return (
    <>
      <section className="home-hero animate-fade-up-heavy" aria-labelledby="home-title">
        <div className="home-hero__content">
          <p className="eyebrow home-hero__eyebrow">Gia phả Việt cho cả dòng họ</p>
          <h1 id="home-title">Cây Gia Phả</h1>
          <p className="home-hero__lead">
            Tạo sơ đồ gia đình, mời người thân cộng tác, lưu ảnh kỷ niệm và xem
            cách xưng hô tiếng Việt được tính tự động theo Bắc, Trung, Nam.
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

        <aside className="home-hero__card double-bezel-card animate-fade-up-heavy stagger-1" aria-label="Tính năng chính">
          <div className="double-bezel-card__inner home-hero__card-inner">
            <img
              src="/hero.png"
              alt="Minh họa Cây Gia Phả"
              className="home-hero__image"
            />
            <div className="home-hero__card-body">
              <div>
                <span className="home-hero__stat">Một cây, nhiều góc nhìn</span>
                <p className="home-hero__card-copy">
                  Quản lý thành viên, quan hệ, ảnh và quyền cộng tác trong cùng một
                  không gian riêng tư.
                </p>
              </div>
              <div className="home-feature-grid">
                <span>Bảo vệ thông tin người còn sống</span>
                <span>Cộng tác theo cây gia phả</span>
                <span>Tìm kiếm và đổi góc nhìn nhanh</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="home-steps animate-fade-up-heavy stagger-2" aria-label="Hướng dẫn bắt đầu nhanh">
          <article className="double-bezel-card">
            <div className="double-bezel-card__inner">
              <span>1</span>
              <h2>Tạo cây đầu tiên</h2>
              <p>Bắt đầu từ chính bạn hoặc người lớn tuổi nhất mà gia đình cùng biết.</p>
            </div>
          </article>
          <article className="double-bezel-card">
            <div className="double-bezel-card__inner">
              <span>2</span>
              <h2>Nối quan hệ cốt lõi</h2>
              <p>Thêm cha mẹ, vợ chồng và con cái trước; các vai vế phức tạp sẽ được suy ra.</p>
            </div>
          </article>
          <article className="double-bezel-card">
            <div className="double-bezel-card__inner">
              <span>3</span>
              <h2>Mời người thân cùng sửa</h2>
              <p>Cộng tác viên có thể bổ sung thông tin để cây gia phả luôn đầy đủ hơn.</p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
