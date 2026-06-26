"use client";

import { useState, useId, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/Button";
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

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={`${inputId}-heading`}>
      <h1 id={`${inputId}-heading`}>Đăng nhập</h1>
      <p>Đăng nhập bằng số điện thoại/email và mật khẩu của bạn.</p>

      {error.form ? (
        <p id={formErrorId} role="alert" className="form-error">
          {error.form}
        </p>
      ) : null}

      <div className="field">
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

      <div className="field" style={{ marginTop: "1rem" }}>
        <label htmlFor={passwordId}>Mật khẩu</label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
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

      <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
        <div style={{ display: "flex", alignItems: "center", textTransform: "uppercase", fontSize: "0.75rem", color: "var(--color-muted)" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-hairline)" }} />
          <span style={{ padding: "0 0.75rem" }}>Hoặc</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-hairline)" }} />
        </div>
        <a
          href="/api/v1/auth/google/login"
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
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.85 2.69-6.57z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.23l-2.91-2.24c-.8.54-1.84.87-3.05.87-2.34 0-4.33-1.58-5.03-3.7H.95v2.3C2.43 15.89 5.5 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V5H.95C.35 6.2.01 7.57.01 9s.34 2.8 1.05 4l2.91-2.3z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.3C13.47.89 11.43 0 9 0 5.5 0 2.43 2.11.95 5.09L3.97 7.4c.7-2.12 2.69-3.82 5.03-3.82z"
            />
          </svg>
          Đăng nhập bằng Google
        </a>
      </div>
    </form>
  );
}
