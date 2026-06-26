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

      <div style={{ marginTop: "1.5rem" }}>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
      </div>
    </form>
  );
}
