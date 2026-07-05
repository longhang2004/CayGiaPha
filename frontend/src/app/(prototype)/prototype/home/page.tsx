"use client";

/**
 * Prototype: Home page
 *
 * Mirrors: src/app/page.tsx
 *
 * Renders the landing page in both logged-out and logged-in states via a
 * toggle. No real session or API call is made.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When src/app/page.tsx UI/UX changes, update this file too.
 */

import { useState } from "react";
import Link from "next/link";

export default function PrototypeHomePage() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <>
      {/* State toggle — not part of the real page */}
      <div
        style={{
          position: "sticky",
          top: "2rem",
          zIndex: 100,
          display: "flex",
          justifyContent: "center",
          marginBottom: "1rem",
          gap: "0.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => setLoggedIn(false)}
          className={`btn${!loggedIn ? "" : " btn-secondary"}`}
          style={{ fontSize: "0.8125rem" }}
        >
          Chưa đăng nhập
        </button>
        <button
          type="button"
          onClick={() => setLoggedIn(true)}
          className={`btn${loggedIn ? "" : " btn-secondary"}`}
          style={{ fontSize: "0.8125rem" }}
        >
          Đã đăng nhập
        </button>
      </div>

      {/* ===== BEGIN: mirror of src/app/page.tsx ===== */}
      <>
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero__content">
            <p className="eyebrow home-hero__eyebrow">Gia phả Việt cho cả dòng họ</p>
            <h1 id="home-title">Cây Gia Phả</h1>
            <p className="home-hero__lead">
              Tạo sơ đồ gia đình, mời người thân cộng tác, lưu ảnh kỷ niệm và
              xem cách xưng hô tiếng Việt được tính tự động theo Bắc, Trung, Nam.
            </p>

            <div className="home-hero__actions">
              {loggedIn ? (
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

          <aside className="home-hero__card double-bezel-card" aria-label="Tính năng chính">
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
                    Quản lý thành viên, quan hệ, ảnh và quyền cộng tác trong cùng
                    một không gian riêng tư.
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

          <div className="home-steps" aria-label="Hướng dẫn bắt đầu nhanh">
            <article className="double-bezel-card">
              <div className="double-bezel-card__inner">
                <span>1</span>
                <h2>Tạo cây đầu tiên</h2>
                <p>
                  Bắt đầu từ chính bạn hoặc người lớn tuổi nhất mà gia đình cùng
                  biết.
                </p>
              </div>
            </article>
            <article className="double-bezel-card">
              <div className="double-bezel-card__inner">
                <span>2</span>
                <h2>Nối quan hệ cốt lõi</h2>
                <p>
                  Thêm cha mẹ, vợ chồng và con cái trước; các vai vế phức tạp sẽ
                  được suy ra.
                </p>
              </div>
            </article>
            <article className="double-bezel-card">
              <div className="double-bezel-card__inner">
                <span>3</span>
                <h2>Mời người thân cùng sửa</h2>
                <p>
                  Cộng tác viên có thể bổ sung thông tin để cây gia phả luôn đầy
                  đủ hơn.
                </p>
              </div>
            </article>
          </div>
        </section>
      </>
      {/* ===== END: mirror of src/app/page.tsx ===== */}
    </>
  );
}
