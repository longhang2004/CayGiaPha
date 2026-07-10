"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { Button } from "@/components/Button";
import { FormControl, Input } from "@/components/ui/FormControls";
import { ApiError } from "@/lib/apiClient";
import { updateMyProfile } from "@/lib/profile";

const SUCCESS_MESSAGE = "Đã cập nhật tên hiển thị.";
const LEGACY_PROMPT =
  "Thêm tên hiển thị để người thân dễ nhận ra bạn khi cộng tác.";
const EMPTY_NAME_ERROR = "Vui lòng nhập tên hiển thị.";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading, refresh } = useSession();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const displayNameId = useId();

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

  useEffect(() => {
    if (user) {
      setDisplayNameInput(user.displayName ?? "");
    }
  }, [user]);

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

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(undefined);
    setSuccessMessage(null);

    const trimmed = displayNameInput.trim();
    if (!trimmed) {
      setFieldError(EMPTY_NAME_ERROR);
      return;
    }

    setSaving(true);
    try {
      const result = await updateMyProfile(trimmed);
      setDisplayNameInput(result.displayName);
      setSuccessMessage(SUCCESS_MESSAGE);
      setIsEditingName(false);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.field === "displayName") {
        setFieldError(err.message);
      } else {
        setFieldError(err instanceof ApiError ? err.message : "Không thể cập nhật tên hiển thị.");
      }
    } finally {
      setSaving(false);
    }
  }

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

  const isLegacyMissingName = !user.displayName;

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

          {isLegacyMissingName ? (
            <p
              className="settings-profile__legacy-prompt"
              style={{
                margin: "0 0 1rem",
                fontSize: "0.9rem",
                color: "var(--color-muted)",
                lineHeight: 1.5,
              }}
            >
              {LEGACY_PROMPT}
            </p>
          ) : null}

          {!isEditingName && !isLegacyMissingName ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-muted)" }}>Tên hiển thị</p>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="btn btn-secondary"
                  style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem", height: "auto", minHeight: "32px" }}
                >
                  Sửa tên
                </button>
              </div>
              <p style={{ margin: 0, fontSize: "1rem", fontWeight: 500, color: "var(--color-fg)" }}>
                {user.displayName}
              </p>
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit} noValidate className="settings-profile__form">
              <FormControl id={displayNameId} label="Tên hiển thị" error={fieldError} required>
                <Input
                  id={displayNameId}
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  error={fieldError}
                  disabled={saving}
                  required
                  maxLength={100}
                />
              </FormControl>

              <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <Button type="submit" loading={saving} loadingLabel="Đang lưu…" disabled={saving}>
                  Lưu tên
                </Button>
                {!isLegacyMissingName && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsEditingName(false);
                      setDisplayNameInput(user.displayName ?? "");
                      setFieldError(undefined);
                      setSuccessMessage(null);
                    }}
                    disabled={saving}
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          )}

            <div style={{ marginBottom: "1rem" }}>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-muted)" }}>
                Số điện thoại hoặc email
              </p>
              <p
                className="settings-profile__identifier"
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "var(--color-fg)",
                  wordBreak: "break-word",
                }}
              >
                {user.identifier}
              </p>
              <p className="field-hint" style={{ marginTop: "0.35rem" }}>
                Định danh đăng nhập (chỉ đọc).
              </p>
            </div>

            {successMessage ? (
              <p role="status" className="settings-profile__success" style={{ marginBottom: "1rem", color: "var(--color-success, #15803d)", fontSize: "0.9rem" }}>
                {successMessage}
              </p>
            ) : null}
          </section>
      </div>
    </main>
  );
}
