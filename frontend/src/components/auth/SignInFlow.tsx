"use client";

import { useState, useId, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { signIn, signInWithGoogle } from "@/lib/auth";
import { Button } from "@/components/Button";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { FormControl, Input } from "@/components/ui/FormControls";
import { toAuthErrorState, fieldErrorFor, type AuthErrorState } from "./authErrors";

interface SignInFlowProps {
  /** Where to navigate after a successful sign-in. Defaults to the app home. */
  redirectTo?: string;
}

/**
  * Sign-in flow: collect identifier and password in a single form. (Requirements 2.1, 2.3)
  */
export function SignInFlow({ redirectTo = "/" }: SignInFlowProps) {
  const router = useRouter();
  const { refresh } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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
    setSubmitting(true);
    try {
      await signIn(identifier.trim(), password);
      await refresh();
      router.push(redirectTo);
    } catch (caught) {
      setError(toAuthErrorState(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(response: CredentialResponse) {
    if (!response.credential) {
      setError({ form: "Google không trả về mã xác thực. Vui lòng thử lại." });
      return;
    }
    setSubmitting(true);
    setError({});
    try {
      await signInWithGoogle(response.credential, "Bac", true, true);
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
        <h1 id={`${inputId}-heading`}>Đăng nhập</h1>
        <p>Đăng nhập bằng số điện thoại/email và mật khẩu của bạn.</p>

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
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={passwordError}
          disabled={submitting}
          required
        />
      </FormControl>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.25rem" }}>
        <a href="/forgot-password" style={{ fontSize: "0.875rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 500 }}>
          Quên mật khẩu?
        </a>
      </div>

      <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Button type="submit" loading={submitting} loadingLabel="Đang đăng nhập…" style={{ width: "100%" }}>
          Đăng nhập
        </Button>
        <div style={{ display: "flex", alignItems: "center", textTransform: "uppercase", fontSize: "0.75rem", color: "var(--color-muted)" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-hairline)" }} />
          <span style={{ padding: "0 0.75rem" }}>Hoặc</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-hairline)" }} />
        </div>
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            opacity: submitting ? 0.65 : 1,
            pointerEvents: submitting ? "none" : "auto",
          }}
        >
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError({ form: "Lỗi đăng nhập Google. Vui lòng thử lại." })}
            text="signin_with"
            shape="rectangular"
          />
        </div>
      </div>
      </form>
        </div>
      </div>
    </div>
  );
}
