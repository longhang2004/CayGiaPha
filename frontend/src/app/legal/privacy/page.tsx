"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
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
          Chính sách bảo mật
        </h1>

        <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", marginBottom: "2rem" }}>
          Phiên bản cập nhật mới nhất: Ngày 30 tháng 6 năm 2026
        </p>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            1. Dữ liệu chúng tôi thu thập
          </h2>
          <p style={{ marginBottom: "0.5rem" }}>
            Để vận hành dịch vụ Cây Gia Phả, chúng tôi thu thập hai nhóm dữ liệu chính:
          </p>
          <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
            <li style={{ marginBottom: "0.5rem" }}><strong>Thông tin tài khoản:</strong> Địa chỉ email, số điện thoại và mật khẩu được mã hóa an toàn khi đăng ký tài khoản.</li>
            <li style={{ marginBottom: "0.5rem" }}><strong>Thông tin sơ đồ gia phả:</strong> Họ tên thành viên, ngày sinh, ngày mất, thông tin xưng hô và các mối quan hệ huyết thống/hôn nhân do bạn nhập liệu.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            2. Cách thức sử dụng thông tin
          </h2>
          <p style={{ marginBottom: "1rem" }}>
            Chúng tôi sử dụng thông tin thu thập được chỉ nhằm mục đích dựng sơ đồ cây gia phả trực quan, tự động tính toán cách xưng hô chuẩn xác theo các hệ thống vùng miền (Bắc, Trung, Nam), hiển thị nhắc nhở sự kiện giỗ chạp và gửi thư mời cộng tác đến những người tham gia cùng xây dựng cây.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            3. Chia sẻ dữ liệu và an toàn thông tin
          </h2>
          <p style={{ marginBottom: "1rem" }}>
            Dữ liệu dòng họ của bạn được bảo mật tuyệt đối. Chúng tôi không bao giờ bán, cho thuê hay chia sẻ dữ liệu gia phả của bạn cho bất kỳ đối tác thương mại nào. Thông tin cây chỉ hiển thị với chính tài khoản của bạn và những tài khoản cộng tác viên được bạn phê duyệt quyền truy cập thông qua thư mời email hoặc liên kết mã chia sẻ.
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            4. Quyền của chủ thể dữ liệu
          </h2>
          <p style={{ marginBottom: "1rem" }}>
            Bạn có toàn quyền kiểm soát dữ liệu của mình. Bất kỳ lúc nào, bạn cũng có quyền yêu cầu xuất bản sao toàn bộ cây gia phả, chỉnh sửa thông tin sai sót của thành viên dòng họ, hoặc thực hiện lệnh xóa vĩnh viễn tài khoản cùng tất cả dữ liệu liên quan khỏi hệ thống dữ liệu của chúng tôi.
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
