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
import {
  CGPCheckbox,
  CGPPasswordField,
  CGPSelect,
  CGPTextField,
} from "@/components/cgp";

export default function PrototypeSignUpPage() {
  const [displayName, setDisplayName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState<Region>("Bac");
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const inputId = useId();
  const displayNameId = `${inputId}-display-name`;
  const passwordId = `${inputId}-password`;

  return (
    <div className="auth-container">
      {/* ===== BEGIN: mirror of SignUpFlow ===== */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "28rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "var(--color-fg)" }}>
            <img src="/logo.svg" alt="Logo Cây Gia Phả" style={{ height: "32px", width: "auto" }} />
            <span style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em" }}>Cây Gia Phả</span>
          </a>
        </div>
        <div className="auth-card">
          <form onSubmit={(e) => { e.preventDefault(); /* no-op in prototype */ }} noValidate>
          <h1 id={`${inputId}-heading`}>Đăng ký</h1>
          <p>Tạo tài khoản cây gia phả mới của bạn.</p>

        <CGPTextField
          id={displayNameId}
          label="Tên hiển thị"
          description="Tên này sẽ được dùng để người thân nhận ra bạn khi cộng tác."
          name="displayName"
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={setDisplayName}
          isRequired
          maxLength={100}
        />

        <CGPTextField
          id={inputId}
          label="Email"
          name="identifier"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={identifier}
          onChange={setIdentifier}
          isRequired
        />

        <CGPPasswordField
          id={passwordId}
          label="Mật khẩu"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          isRequired
        />

        <CGPSelect
          id="signup-region"
          label="Vùng miền (cách xưng hô)"
          description="Chọn vùng miền của bạn — điều này quyết định cách xưng hô (ví dụ bố/ba, mẹ/má)."
          items={REGION_OPTIONS}
          selectedKey={region}
          onSelectionChange={(key) => setRegion(String(key) as Region)}
        />

        <div className="auth-consents">
          <CGPCheckbox isSelected={acceptedTos} onChange={setAcceptedTos}>
            Tôi đồng ý với <a href="/legal/tos" onClick={(e) => e.stopPropagation()}>Điều khoản dịch vụ</a>.
          </CGPCheckbox>
          <CGPCheckbox isSelected={acceptedPrivacy} onChange={setAcceptedPrivacy}>
            Tôi đồng ý với <a href="/legal/privacy" onClick={(e) => e.stopPropagation()}>Chính sách bảo mật</a>.
          </CGPCheckbox>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Button type="submit" disabled={!acceptedTos || !acceptedPrivacy} style={{ width: "100%" }}>
            Đăng ký
          </Button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              textDecoration: "none",
              backgroundColor: "#ffffff",
              color: "#3c4043",
              border: "1px solid #dadce0",
              fontWeight: 500,
              width: "100%",
              borderRadius: "8px",
              minHeight: "44px"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.85 2.69-6.57z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.23l-2.91-2.24c-.8.54-1.84.87-3.05.87-2.34 0-4.33-1.58-5.03-3.7H.95v2.3C2.43 15.89 5.5 18 9 18z"/>
              <path fill="#FBBC05" d="M3.97 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V5H.95C.35 6.2.01 7.57.01 9s.34 2.8 1.05 4l2.91-2.3z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.3C13.47.89 11.43 0 9 0 5.5 0 2.43 2.11.95 5.09L3.97 7.4c.7-2.12 2.69-3.82 5.03-3.82z"/>
            </svg>
            Đăng ký bằng Google
          </button>
          <a href="/prototype/signin?redirect=%2Finvitation%2Fexample&reason=invitation" style={{ textAlign: "center" }}>
            Đã có tài khoản? Đăng nhập ngay!
          </a>
        </div>
        </form>
      </div>
    </div>
      {/* ===== END ===== */}
    </div>
  );
}
