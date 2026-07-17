"use client";

import { useState, useId, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { signUp, signInWithGoogle } from "@/lib/auth";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { REGION_OPTIONS, type Region } from "@/lib/region";
import { Button } from "@/components/Button";
import {
  CGPCheckbox,
  CGPPasswordField,
  CGPSelect,
  CGPTextField,
} from "@/components/cgp";
import { toAuthErrorState, fieldErrorFor, unmappedFieldError, type AuthErrorState } from "./authErrors";
import { buildAuthHref } from "@/lib/authRedirect";

interface SignUpFlowProps {
  /** Where to navigate after a verified sign-up. Defaults to the app home. */
  redirectTo?: string;
  reason?: string;
}

/**
 * Sign-up flow: collect region, identifier, password, and consents in a single form. (Requirements 1.1, 1.2, 1.3, 9.2)
 */
const EMPTY_DISPLAY_NAME_ERROR = "Vui lòng nhập tên hiển thị.";

export function SignUpFlow({ redirectTo = "/", reason }: SignUpFlowProps) {
  const router = useRouter();
  const { refresh } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState<Region>("Bac");
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState<AuthErrorState>({});
  const [submitting, setSubmitting] = useState(false);

  const inputId = useId();
  const displayNameId = `${inputId}-display-name`;
  const passwordId = `${inputId}-password`;
  const formErrorId = `${inputId}-form-error`;

  const displayNameError = fieldErrorFor(error, "displayName");
  const identifierError = fieldErrorFor(error, "identifier");
  const passwordError = fieldErrorFor(error, "password");
  const unmappedError = unmappedFieldError(error, ["displayName", "identifier", "password"]);
  const formError = error.form || unmappedError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError({});

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError({ field: { name: "displayName", message: EMPTY_DISPLAY_NAME_ERROR } });
      return;
    }

    if (!acceptedTos || !acceptedPrivacy) {
      setError({ form: "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật để tiếp tục." });
      return;
    }

    setSubmitting(true);
    try {
      await signUp(
        identifier.trim(),
        password,
        region,
        acceptedTos,
        acceptedPrivacy,
        trimmedName,
      );
      await refresh();
      router.push(redirectTo);
    } catch (caught) {
      setError(toAuthErrorState(caught));
    } finally {
      setSubmitting(false);
    }
  }

  const handleGoogleClick = () => {
    if (!displayName.trim()) {
      setError({ field: { name: "displayName", message: EMPTY_DISPLAY_NAME_ERROR } });
      return false;
    }
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
      const trimmedName = displayName.trim();
      await signInWithGoogle(
        response.credential,
        region,
        acceptedTos,
        acceptedPrivacy,
        trimmedName,
      );
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

      {formError ? (
        <p id={formErrorId} role="alert" className="form-error">
          {formError}
        </p>
      ) : null}

      <CGPTextField
        id={displayNameId}
        label="Tên hiển thị"
        description="Tên này sẽ được dùng để người thân nhận ra bạn khi cộng tác."
        name="displayName"
        autoComplete="name"
        value={displayName}
        onChange={setDisplayName}
        errorMessage={displayNameError}
        isInvalid={Boolean(displayNameError)}
        isDisabled={submitting}
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
        errorMessage={identifierError}
        isInvalid={Boolean(identifierError)}
        isDisabled={submitting}
        isRequired
      />

      <CGPPasswordField
        id={passwordId}
        label="Mật khẩu"
        name="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        errorMessage={passwordError}
        isInvalid={Boolean(passwordError)}
        isDisabled={submitting}
        isRequired
      />

      <CGPSelect
        id="signup-region"
        label="Vùng miền (cách xưng hô)"
        description="Chọn vùng miền của bạn — điều này quyết định cách xưng hô (ví dụ bố/ba, mẹ/má)."
        items={REGION_OPTIONS}
        selectedKey={region}
        onSelectionChange={(key) => setRegion(String(key) as Region)}
        isDisabled={submitting}
      />

      <div className="auth-consents">
        <CGPCheckbox
          isSelected={acceptedTos}
          onChange={setAcceptedTos}
          isDisabled={submitting}
        >
          Tôi đồng ý với <a href="/legal/tos" onClick={(e) => e.stopPropagation()}>Điều khoản dịch vụ</a>.
        </CGPCheckbox>
        <CGPCheckbox
          isSelected={acceptedPrivacy}
          onChange={setAcceptedPrivacy}
          isDisabled={submitting}
        >
          Tôi đồng ý với <a href="/legal/privacy" onClick={(e) => e.stopPropagation()}>Chính sách bảo mật</a>.
        </CGPCheckbox>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Button type="submit" disabled={!acceptedTos || !acceptedPrivacy} loading={submitting} loadingLabel="Đang đăng ký…" style={{ width: "100%" }}>
          Đăng ký
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
        <a href={buildAuthHref("/signin", redirectTo, reason)} style={{ textAlign: "center" }}>
          Đã có tài khoản? Đăng nhập ngay!
        </a>
      </div>
      </form>
        </div>
      </div>
    </div>
  );
}
