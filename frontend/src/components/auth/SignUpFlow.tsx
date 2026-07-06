"use client";

import { useState, useId, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { signUp, signInWithGoogle } from "@/lib/auth";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { REGION_OPTIONS, type Region } from "@/lib/region";
import { Button } from "@/components/Button";
import { FormControl, Input, Select } from "@/components/ui/FormControls";
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

  const handleGoogleClick = () => {
    if (!acceptedTos || !acceptedPrivacy) {
      setError({ form: "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật để tiếp tục đăng ký bằng Google." });
      return false;
    }
    return true;
  };

  async function handleGoogleSuccess(response: CredentialResponse) {
    if (!handleGoogleClick()) {
      return;
    }
    if (!response.credential) {
      setError({ form: "Google không trả về mã xác thực. Vui lòng thử lại." });
      return;
    }
    setSubmitting(true);
    setError({});
    try {
      await signInWithGoogle(response.credential, region, acceptedTos, acceptedPrivacy);
      await refresh();
      router.push(redirectTo);
    } catch (caught) {
      setError(toAuthErrorState(caught));
    } finally {
      setSubmitting(false);
    }
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
        <form onSubmit={handleSubmit} noValidate aria-labelledby={`${inputId}-heading`}>
        <h1 id={`${inputId}-heading`}>Đăng ký</h1>
        <p>Tạo tài khoản cây gia phả mới của bạn.</p>

      {error.form ? (
        <p id={formErrorId} role="alert" className="form-error">
          {error.form}
        </p>
      ) : null}

      <FormControl id={inputId} label="Số điện thoại hoặc email" error={identifierError} required>
        <Input
          id={inputId}
          name="identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          error={identifierError}
          disabled={submitting}
          required
        />
      </FormControl>

      <FormControl id={passwordId} label="Mật khẩu" error={passwordError} required>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={passwordError}
          disabled={submitting}
          required
        />
      </FormControl>

      <FormControl id="signup-region" label="Vùng miền (cách xưng hô)">
        <Select
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
        </Select>
        <p className="field-hint" style={{ marginTop: "0.5rem" }}>
          Chọn vùng miền của bạn — điều này quyết định cách xưng hô (ví dụ bố/ba, mẹ/má).
        </p>
      </FormControl>

      <div className="field" style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Button type="submit" disabled={submitting || !acceptedTos || !acceptedPrivacy} style={{ width: "100%" }}>
          {submitting ? "Đang đăng ký…" : "Đăng ký"}
        </Button>
        <div style={{ display: "flex", alignItems: "center", textTransform: "uppercase", fontSize: "0.75rem", color: "var(--color-muted)" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-hairline)" }} />
          <span style={{ padding: "0 0.75rem" }}>Hoặc</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-hairline)" }} />
        </div>
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          {!acceptedTos || !acceptedPrivacy ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGoogleClick}
              disabled={submitting}
              style={{
                width: "100%",
                backgroundColor: "#ffffff",
                color: "#3c4043",
                border: "1px solid #dadce0",
                borderRadius: "8px",
                minHeight: "44px",
              }}
            >
              Đăng ký bằng Google
            </button>
          ) : (
            <div
              style={{
                opacity: submitting ? 0.65 : 1,
                pointerEvents: submitting ? "none" : "auto",
              }}
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError({ form: "Lỗi đăng ký Google. Vui lòng thử lại." })}
                text="signup_with"
                shape="rectangular"
              />
            </div>
          )}
        </div>
      </div>
      </form>
        </div>
      </div>
    </div>
  );
}
