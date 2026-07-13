"use client";

import { useState, useId, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { requestPasswordReset, confirmPasswordReset } from "@/lib/auth";
import { useSession } from "@/app/providers";
import { Button } from "@/components/Button";
import { CGPPasswordField, CGPTextField } from "@/components/cgp";
import { IdentifierForm } from "./IdentifierForm";
import { toAuthErrorState, fieldErrorFor, type AuthErrorState } from "./authErrors";

export interface ForgotPasswordFlowProps {
  requestAction?: (identifier: string) => Promise<void>;
  confirmAction?: (identifier: string, code: string, password: string) => Promise<void>;
  onComplete?: () => void | Promise<void>;
}

export function ForgotPasswordFlow({
  requestAction = requestPasswordReset,
  confirmAction = confirmPasswordReset,
  onComplete,
}: ForgotPasswordFlowProps = {}) {
  const router = useRouter();
  const { refresh } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [step, setStep] = useState<"request" | "confirm">("request");

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<AuthErrorState>({});
  const [submitting, setSubmitting] = useState(false);

  const inputId = useId();
  const codeId = `${inputId}-code`;
  const passwordId = `${inputId}-password`;
  const formErrorId = `${inputId}-form-error`;

  const codeError = fieldErrorFor(error, "code");
  const passwordError = fieldErrorFor(error, "password");

  async function handleRequest(id: string) {
    await requestAction(id);
    setIdentifier(id);
    setStep("confirm");
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError({});
    setSubmitting(true);
    try {
      await confirmAction(identifier, code.trim(), password);
      if (onComplete) {
        await onComplete();
      } else {
        await refresh();
        router.push("/tree");
      }
    } catch (caught) {
      setError(toAuthErrorState(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "request") {
    return (
      <div className="auth-wrapper animate-fade-up-heavy stagger-1" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "30rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", color: "var(--color-fg)" }}>
            <img src="/logo.svg" alt="Logo Cây Gia Phả" style={{ height: "40px", width: "auto" }} />
            <span style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.03em" }}>Cây Gia Phả</span>
          </a>
        </div>
        <div className="double-bezel-card" style={{ width: "100%" }}>
          <div className="double-bezel-card__inner">
            <IdentifierForm
              heading="Quên mật khẩu"
              description="Nhập số điện thoại hoặc email của bạn để nhận mã xác thực."
              submitLabel="Gửi mã"
              onSubmit={handleRequest}
              identifierLabel="Số điện thoại hoặc email"
              identifierInputMode="text"
            />
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <a href="/signin" style={{ color: "var(--color-fg)", textDecoration: "none", fontSize: "0.875rem" }}>
                &larr; Quay lại đăng nhập
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper animate-fade-up-heavy stagger-1" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "30rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", color: "var(--color-fg)" }}>
          <img src="/logo.svg" alt="Logo Cây Gia Phả" style={{ height: "40px", width: "auto" }} />
          <span style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.03em" }}>Cây Gia Phả</span>
        </a>
      </div>
      <div className="double-bezel-card" style={{ width: "100%" }}>
        <div className="double-bezel-card__inner">
          <form onSubmit={handleConfirm} noValidate aria-labelledby={`${inputId}-heading`}>
            <h1 id={`${inputId}-heading`}>Tạo mật khẩu mới</h1>
            <p>Mã xác thực đã được gửi đến {identifier}.</p>

            {error.form ? (
              <p id={formErrorId} role="alert" className="form-error">
                {error.form}
              </p>
            ) : null}

            <CGPTextField
              id={codeId}
              label="Mã xác nhận (6 chữ số)"
              name="code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={setCode}
              errorMessage={codeError}
              isInvalid={Boolean(codeError)}
              isDisabled={submitting}
              isRequired
            />

            <CGPPasswordField
              id={passwordId}
              label="Mật khẩu mới (ít nhất 8 ký tự)"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              errorMessage={passwordError}
              isInvalid={Boolean(passwordError)}
              isDisabled={submitting}
              isRequired
            />

            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Button type="submit" loading={submitting} loadingLabel="Đang xử lý…" style={{ width: "100%" }}>
                Cập nhật mật khẩu
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
