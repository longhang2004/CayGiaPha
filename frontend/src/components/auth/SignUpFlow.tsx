"use client";

import { useState, useId, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { signUp } from "@/lib/auth";
import { REGION_OPTIONS, type Region } from "@/lib/region";
import { Button } from "@/components/Button";
import { toAuthErrorState, fieldErrorFor, type AuthErrorState } from "./authErrors";

interface SignUpFlowProps {
  /** Where to navigate after a verified sign-up. Defaults to the app home. */
  redirectTo?: string;
}

/**
 * Sign-up flow: collect region, identifier, password, and consents in a single form. (Requirements 1.1, 1.2, 1.3, 9.2)
 */
export function SignUpFlow({ redirectTo = "/" }: SignUpFlowProps) {
  const router = useRouter();
  const { refresh } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState<Region>("Bac");
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState<AuthErrorState>({});
  const [submitting, setSubmitting] = useState(false);

  const inputId = useId();
  const passwordId = `${inputId}-password`;
  const errorId = `${inputId}-error`;
  const passwordErrorId = `${passwordId}-error`;
  const formErrorId = `${inputId}-form-error`;

  const identifierError = fieldErrorFor(error, "identifier");
  const passwordError = fieldErrorFor(error, "password");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError({});

    if (!acceptedTos || !acceptedPrivacy) {
      setError({ form: "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật để tiếp tục." });
      return;
    }

    setSubmitting(true);
    try {
      await signUp(identifier.trim(), password, region, acceptedTos, acceptedPrivacy);
      await refresh();
      router.push(redirectTo);
    } catch (caught) {
      setError(toAuthErrorState(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={`${inputId}-heading`}>
      <h1 id={`${inputId}-heading`}>Đăng ký</h1>
      <p>Tạo tài khoản cây gia phả mới của bạn.</p>

      {error.form ? (
        <p id={formErrorId} role="alert" className="form-error">
          {error.form}
        </p>
      ) : null}

      <div className="field" style={{ marginBottom: "1rem" }}>
        <label htmlFor="signup-region">Vùng miền (cách xưng hô)</label>
        <select
          id="signup-region"
          value={region}
          onChange={(e) => setRegion(e.target.value as Region)}
          disabled={submitting}
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
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          aria-invalid={identifierError ? true : undefined}
          aria-describedby={identifierError ? errorId : undefined}
          disabled={submitting}
          required
        />
        {identifierError ? (
          <p id={errorId} role="alert" className="field-error">
            {identifierError}
          </p>
        ) : null}
      </div>

      <div className="field" style={{ marginBottom: "1.5rem" }}>
        <label htmlFor={passwordId}>Mật khẩu</label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? passwordErrorId : undefined}
          disabled={submitting}
          required
        />
        {passwordError ? (
          <p id={passwordErrorId} role="alert" className="field-error">
            {passwordError}
          </p>
        ) : null}
      </div>

      <div className="field" style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)" }}>
          <input
            type="checkbox"
            checked={acceptedTos}
            onChange={(e) => setAcceptedTos(e.target.checked)}
            style={{ margin: 0 }}
            disabled={submitting}
          />
          <span>Tôi đồng ý với <a href="/legal/tos" onClick={(e) => e.stopPropagation()}>Điều khoản dịch vụ</a>.</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)" }}>
          <input
            type="checkbox"
            checked={acceptedPrivacy}
            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
            style={{ margin: 0 }}
            disabled={submitting}
          />
          <span>Tôi đồng ý với <a href="/legal/privacy" onClick={(e) => e.stopPropagation()}>Chính sách bảo mật</a>.</span>
        </label>
        <p className="field-hint" style={{ margin: 0 }}>
          Bạn cần đồng ý với cả hai để tạo cây gia phả.
        </p>
      </div>

      <Button type="submit" disabled={submitting || !acceptedTos || !acceptedPrivacy}>
        {submitting ? "Đang đăng ký…" : "Đăng ký"}
      </Button>
    </form>
  );
}
