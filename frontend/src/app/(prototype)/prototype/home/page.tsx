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
              Tạo hoặc tham gia cây gia phả, cùng người thân bổ sung thành viên và
              ảnh kỷ niệm, rồi xem cách xưng hô tiếng Việt được tính theo người bạn chọn để xét vai vế
              và vùng Bắc, Trung, Nam.
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
              <Link href="/help" className="btn btn-secondary">
                Hướng dẫn sử dụng
              </Link>
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

          <div className="home-steps" aria-label="Hướng dẫn bắt đầu nhanh">
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
      {/* ===== END: mirror of src/app/page.tsx ===== */}
    </>
  );
}
