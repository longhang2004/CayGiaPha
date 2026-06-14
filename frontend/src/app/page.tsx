"use client";

import Link from "next/link";
import { useSession } from "@/app/providers";

export default function HomePage() {
  const { user, loading } = useSession();

  return (
    <section style={{ maxWidth: "42rem", margin: "4rem auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>Cây Gia Phả</h1>
      <p style={{ fontSize: "1.125rem", lineHeight: "1.6", marginBottom: "2.5rem" }}>
        Xây dựng và trực quan hóa gia phả của dòng họ, với cách xưng hô tiếng
        Việt được tính tự động theo bên nội/ngoại, giới tính, vai vế và vùng
        miền.
      </p>

      {!loading && (
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
          {user ? (
            <Link href="/tree" className="btn" style={{ textDecoration: "none", padding: "0.75rem 2rem", fontSize: "1rem" }}>
              Xem sơ đồ gia phả
            </Link>
          ) : (
            <>
              <Link href="/signup" className="btn" style={{ textDecoration: "none", padding: "0.75rem 2rem", fontSize: "1rem" }}>
                Đăng ký ngay
              </Link>
              <Link href="/signin" className="btn btn-secondary" style={{ textDecoration: "none", padding: "0.75rem 2rem", fontSize: "1rem" }}>
                Đăng nhập
              </Link>
            </>
          )}
        </div>
      )}
    </section>
  );
}
