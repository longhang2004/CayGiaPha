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
            Tạo hoặc tham gia cây gia phả, cùng người thân bổ sung thành viên và
            ảnh kỷ niệm, rồi xem cách xưng hô tiếng Việt được tính theo người bạn chọn để xét vai vế
            và vùng Bắc, Trung, Nam.
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
            <Link href="/help" className="btn btn-secondary">
              Hướng dẫn sử dụng
            </Link>
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
                <span className="home-hero__stat">Một cây, nhiều cách xưng hô</span>
                <p className="home-hero__card-copy">
                  Quản lý thành viên, quan hệ, ảnh, quyền cộng tác và chế độ chia
                  sẻ trong cùng một không gian gia đình.
                </p>
              </div>
              <div className="home-feature-grid">
                <span>Quan hệ trực tiếp hoặc tên gọi tự khai báo</span>
                <span>Bảo vệ người còn sống và kiểm soát chia sẻ</span>
                <span>Tìm kiếm, đổi người xét và cộng tác</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="home-steps animate-fade-up-heavy stagger-2" aria-label="Hướng dẫn bắt đầu nhanh">
          <article className="home-step">
            <span className="home-step__num">1</span>
            <div className="home-step__content">
              <h2>Tạo hoặc tham gia một cây</h2>
              <p>Tạo cây mới, mở cây đã có hoặc nhập mã mời 6 ký tự từ người thân.</p>
            </div>
          </article>
          <article className="home-step">
            <span className="home-step__num">2</span>
            <div className="home-step__content">
              <h2>Thêm người và nối quan hệ</h2>
              <p>Bắt đầu với một thành viên, rồi thêm cha, mẹ, vợ/chồng hoặc con để hệ thống tính xưng hô.</p>
            </div>
          </article>
          <article className="home-step">
            <span className="home-step__num">3</span>
            <div className="home-step__content">
              <h2>Cùng người thân hoàn thiện</h2>
              <p>Mời cộng tác viên, bổ sung ảnh và dùng tên gọi khai báo khi thiếu người trung gian.</p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
