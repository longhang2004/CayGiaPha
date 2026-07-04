"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/signin?redirect=/settings");
    }
  }, [user, sessionLoading, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, []);

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (newTheme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.remove("dark", "light");
    }
  };

  if (sessionLoading || !user) {
    return (
      <section className="center-state" aria-live="polite">
        <div className="center-state__card">
          <span className="center-state__spinner" aria-hidden="true" />
          <p>Đang tải…</p>
        </div>
      </section>
    );
  }

  return (
    <main style={{ maxWidth: "800px", margin: "3rem auto", padding: "0 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-brand)" }}>
          Cài đặt hệ thống
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
          Quản lý tùy chọn hiển thị và tài khoản của bạn.
        </p>
      </div>

      <div className="surface-card" style={{ padding: "2rem", borderRadius: "12px", border: "1px solid var(--color-hairline)" }}>
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "var(--color-fg)" }}>
            Chế độ hiển thị (Theme)
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--color-muted)", marginBottom: "1.5rem" }}>
            Chọn giao diện sáng, tối hoặc tự động đồng bộ theo thiết bị hệ thống của bạn.
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleThemeChange(t)}
                className={`btn ${theme === t ? "btn-primary btn-terracotta" : "btn-secondary"}`}
                style={{
                  padding: "0.6rem 1.5rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  textTransform: "capitalize"
                }}
              >
                {t === "light" ? "Giao diện sáng" : t === "dark" ? "Giao diện tối" : "Hệ thống"}
              </button>
            ))}
          </div>
        </section>

        <hr style={{ border: 0, borderTop: "1px solid var(--color-hairline)", margin: "2rem 0" }} />

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "var(--color-fg)" }}>
            Tài khoản của bạn
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-muted)" }}>
              Tên tài khoản: <strong style={{ color: "var(--color-fg)" }}>{user.identifier}</strong>
            </p>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-muted)" }}>
              ID Người dùng: <strong style={{ color: "var(--color-fg)" }}>{user.userId}</strong>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
