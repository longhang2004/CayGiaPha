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
      <div className="auth-card">
        <form onSubmit={(e) => { e.preventDefault(); /* no-op in prototype */ }} noValidate>
        <h1 id={`${inputId}-heading`}>Đăng ký</h1>
        <p>Tạo tài khoản cây gia phả mới của bạn.</p>

        <div className="field" style={{ marginBottom: "1rem" }}>
          <label htmlFor="signup-region">Vùng miền (cách xưng hô)</label>
          <select
            id="signup-region"
            value={region}
            onChange={(e) => setRegion(e.target.value as Region)}
          >
            {REGION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="field-hint">
            Chọn vùng miền của bạn — điều này quyết định cách xưng hô (ví dụ bố/ba, mẹ/má).
          </p>
        </div>

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
      {/* ===== END ===== */}
    </div>
  );
}
