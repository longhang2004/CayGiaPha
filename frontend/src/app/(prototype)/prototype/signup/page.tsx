"use client";

/**
 * Prototype: Sign-up — Step 1 (Region + TOS + Identifier + Password)
 *
 * Mirrors: src/app/signup/page.tsx → SignUpFlow
 *
 * The onSubmit handler is a no-op. Both consent checkboxes start unchecked.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When src/app/signup/page.tsx or SignUpFlow UI/UX changes, update this file too.
 */

import { useState, useId } from "react";
import { REGION_OPTIONS, type Region } from "@/lib/region";
import { Button } from "@/components/Button";

export default function PrototypeSignUpPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState<Region>("Bac");
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const inputId = useId();
  const passwordId = `${inputId}-password`;

  return (
    <div className="auth-container">
      {/* ===== BEGIN: mirror of SignUpFlow ===== */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "28rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "var(--color-fg)" }}>
            <img src="/logo.png" alt="Logo Cây Gia Phả" style={{ height: "32px", width: "auto" }} />
            <span style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em" }}>Cây Gia Phả</span>
          </a>
        </div>
        <div className="auth-card">
          <form onSubmit={(e) => { e.preventDefault(); /* no-op in prototype */ }} noValidate>
          <h1 id={`${inputId}-heading`}>Đăng ký</h1>
          <p>Tạo tài khoản cây gia phả mới của bạn.</p>

        <div className="field" style={{ marginBottom: "1rem" }}>
          <label htmlFor={inputId}>Số điện thoại hoặc email</label>
          <input
            id={inputId}
            name="identifier"
            type="text"
            inputMode="email"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />
        </div>

        <div className="field" style={{ marginBottom: "1rem" }}>
          <label htmlFor={passwordId}>Mật khẩu</label>
          <input
            id={passwordId}
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <div className="field" style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)" }}>
            <input
              type="checkbox"
              checked={acceptedTos}
              onChange={(e) => setAcceptedTos(e.target.checked)}
              style={{ margin: 0 }}
            />
            <span>Tôi đồng ý với <a href="/legal/tos" onClick={(e) => e.stopPropagation()}>Điều khoản dịch vụ</a>.</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)" }}>
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              style={{ margin: 0 }}
            />
            <span>Tôi đồng ý với <a href="/legal/privacy" onClick={(e) => e.stopPropagation()}>Chính sách bảo mật</a>.</span>
          </label>
        </div>

        <Button type="submit" disabled={!acceptedTos || !acceptedPrivacy}>
          Đăng ký
        </Button>
        </form>
      </div>
    </div>
      {/* ===== END ===== */}
    </div>
  );
}
