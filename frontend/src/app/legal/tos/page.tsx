"use client";

import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div style={{
      backgroundColor: "var(--color-bg)",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "3rem 1.5rem"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "2rem"
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "var(--color-fg)" }}>
          <img src="/logo.svg" alt="Logo Cây Gia Phả" style={{ height: "32px", width: "auto" }} />
          <span style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em" }}>Cây Gia Phả</span>
        </Link>
      </div>

      <main style={{
        backgroundColor: "var(--color-surface-card)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "16px",
        padding: "2.5rem",
        maxWidth: "800px",
        width: "100%",
        boxShadow: "0 16px 40px rgba(38, 37, 30, 0.04)",
        fontFamily: "var(--font-sans, inherit)",
        color: "var(--color-fg)",
        lineHeight: "1.6"
      }}>
        <h1 style={{
          fontSize: "2rem",
          fontWeight: 600,
          marginBottom: "1.5rem",
          color: "var(--color-brand)",
          borderBottom: "1px solid var(--color-hairline)",
          paddingBottom: "1rem"
        }}>
          Điều khoản dịch vụ
        </h1>

        <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", marginBottom: "2rem" }}>
          Phiên bản cập nhật mới nhất: Ngày 30 tháng 6 năm 2026
        </p>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            1. Quy định chung
          </h2>
          <p style={{ marginBottom: "1rem" }}>
            Chào mừng bạn đến với <strong>Cây Gia Phả</strong>. Bằng việc khởi tạo tài khoản và sử dụng bất kỳ phần nào của dịch vụ này, bạn đồng ý tuân thủ toàn bộ các quy định và điều khoản sử dụng được nêu tại đây. Nếu không đồng ý, vui lòng ngưng sử dụng dịch vụ.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            2. Quyền sở hữu và trách nhiệm thông tin
          </h2>
          <p style={{ marginBottom: "1rem" }}>
            Sơ đồ gia phả và mọi thông tin liên quan đến các thành viên trong dòng họ do bạn tạo lập hoàn toàn thuộc quyền quản lý và sở hữu thông tin của bạn. Bạn tự chịu trách nhiệm bảo mật mật khẩu đăng nhập, mã xác thực OTP cũng như mọi hành động phát sinh từ việc chia sẻ quyền quản trị cây gia phả.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            3. Quyền riêng tư và bảo vệ dữ liệu cá nhân
          </h2>
          <p style={{ marginBottom: "1rem" }}>
            Chúng tôi cam kết tôn trọng tuyệt đối quyền riêng tư cá nhân và tuân thủ các quy định hiện hành về bảo vệ dữ liệu của pháp luật Việt Nam. Hệ thống cung cấp các tùy chọn ẩn/hiển thị đối với thông tin thành viên còn sống nhằm tránh rò rỉ dữ liệu nhạy cảm ra ngoài cộng đồng.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            4. Hành vi bị nghiêm cấm
          </h2>
          <p style={{ marginBottom: "0.5rem" }}>
            Người dùng không được phép thực hiện các hành vi sau:
          </p>
          <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
            <li style={{ marginBottom: "0.5rem" }}>Giả mạo các thông tin liên quan đến danh tính hoặc dòng họ của người khác.</li>
            <li style={{ marginBottom: "0.5rem" }}>Đăng tải các nội dung độc hại, xúc phạm hoặc vi phạm thuần phong mỹ tục Việt Nam.</li>
            <li style={{ marginBottom: "0.5rem" }}>Sử dụng công cụ tự động quét dữ liệu (scraping) gây quá tải hệ thống.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            5. Thay đổi điều khoản sử dụng
          </h2>
          <p style={{ marginBottom: "1rem" }}>
            Chúng tôi có quyền cập nhật, thay đổi hoặc bổ sung Điều khoản dịch vụ này vào bất kỳ lúc nào để phù hợp với định hướng phát triển và quy định luật pháp. Mọi sự thay đổi lớn sẽ được thông báo trực tiếp qua giao diện ứng dụng.
          </p>
        </section>

        <div style={{
          display: "flex",
          justifyContent: "center",
          borderTop: "1px solid var(--color-hairline)",
          paddingTop: "1.5rem"
        }}>
          <Link href="/signup" className="btn btn-secondary" style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontWeight: 500,
            padding: "0.5rem 1.5rem"
          }}>
            ← Quay lại đăng ký
          </Link>
        </div>
      </main>
    </div>
  );
}
