"use client";

/**
 * Prototype: Sign-in — Step 1 (Identifier + Password)
 *
 * Mirrors: src/app/signin/page.tsx → SignInFlow
 *
 * The onSubmit handler is a no-op so no API call is made.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When src/app/signin/page.tsx or SignInFlow UI/UX changes, update this file too.
 */

import { useState, useId } from "react";
import { Button } from "@/components/Button";

export default function PrototypeSignInPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const inputId = useId();
  const passwordId = `${inputId}-password`;

  return (
    <div className="auth-container">
      {/* ===== BEGIN: mirror of SignInFlow ===== */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "28rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "var(--color-fg)" }}>
            <img src="/logo.png" alt="Logo Cây Gia Phả" style={{ height: "32px", width: "auto" }} />
            <span style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em" }}>Cây Gia Phả</span>
          </a>
        </div>
        <div className="auth-card">
          <form onSubmit={(e) => { e.preventDefault(); /* no-op in prototype */ }} noValidate>
          <h1 id={`${inputId}-heading`}>Đăng nhập</h1>
          <p>Đăng nhập bằng số điện thoại/email và mật khẩu của bạn.</p>

        <div className="field">
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

        <div className="field" style={{ marginTop: "1rem" }}>
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

        <div style={{ marginTop: "1.5rem" }}>
          <Button type="submit">
            Đăng nhập
          </Button>
        </div>
        </form>
      </div>
    </div>
      {/* ===== END ===== */}
    </div>
  );
}
