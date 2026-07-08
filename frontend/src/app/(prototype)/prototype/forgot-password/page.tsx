"use client";

import { useState, useId } from "react";
import { Button } from "@/components/Button";
import { FormControl, Input } from "@/components/ui/FormControls";

export default function PrototypeForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const inputId = useId();
  const codeId = `${inputId}-code`;
  const passwordId = `${inputId}-password`;

  return (
    <div className="auth-container">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "28rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "var(--color-fg)" }}>
            <img src="/logo.svg" alt="Logo Cây Gia Phả" style={{ height: "32px", width: "auto" }} />
            <span style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em" }}>Cây Gia Phả</span>
          </a>
        </div>
        <div className="auth-card">
          {step === "request" ? (
            <form onSubmit={(e) => { e.preventDefault(); setStep("confirm"); }} noValidate>
              <h1 id={`${inputId}-heading`}>Quên mật khẩu</h1>
              <p>Nhập số điện thoại hoặc email của bạn để nhận mã xác thực.</p>

              <FormControl id={inputId} label="Số điện thoại hoặc email" required>
                <Input
                  id={inputId}
                  name="identifier"
                  type="text"
                  inputMode="email"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                />
              </FormControl>

              <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Button type="submit" style={{ width: "100%" }}>
                  Gửi mã
                </Button>
              </div>
              <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <a href="/prototype/signin" style={{ color: "var(--color-fg)", textDecoration: "none", fontSize: "0.875rem" }}>
                  &larr; Quay lại đăng nhập
                </a>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); alert("Prototype: Success!"); }} noValidate>
              <h1 id={`${inputId}-heading`}>Tạo mật khẩu mới</h1>
              <p>Mã xác thực đã được gửi đến {identifier}.</p>

              <FormControl id={codeId} label="Mã xác nhận (6 chữ số)" required>
                <Input
                  id={codeId}
                  name="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </FormControl>

              <FormControl id={passwordId} label="Mật khẩu mới (ít nhất 8 ký tự)" required>
                <Input
                  id={passwordId}
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </FormControl>

              <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Button type="submit" style={{ width: "100%" }}>
                  Cập nhật mật khẩu
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
