"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import {
  fieldErrorFor,
  toAuthErrorState,
  type AuthErrorState,
} from "./authErrors";

interface OtpFormProps {
  /** Heading describing the verification step. */
  heading: string;
  /** The identifier the code was sent to, shown for context. */
  identifier: string;
  /** Submit-button label. */
  submitLabel: string;
  /**
   * Called with the entered 6-digit code. Should throw an `ApiError` (or any
   * Error) on failure so field/form errors can render.
   */
  onSubmit: (code: string) => Promise<void>;
  /** Optional control to go back and re-enter the identifier. */
  onBack?: () => void;
}

/**
 * Second step of the sign-up / sign-in flows: enter the 6-digit one-time code.
 * Verification failures from the backend envelope (e.g. `code` field) render
 * against this input. (Requirements 1.3, 1.4, 2.2, 2.3)
 */
export function OtpForm({
  heading,
  identifier,
  submitLabel,
  onSubmit,
  onBack,
}: OtpFormProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const formErrorId = `${inputId}-form-error`;

  const [code, setCode] = useState("");
  const [error, setError] = useState<AuthErrorState>({});
  const [submitting, setSubmitting] = useState(false);

  const codeError = fieldErrorFor(error, "code");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError({});
    setSubmitting(true);
    try {
      await onSubmit(code.trim());
    } catch (caught) {
      setError(toAuthErrorState(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={`${inputId}-heading`}>
      <h1 id={`${inputId}-heading`}>{heading}</h1>
      <p>
        Nhập mã 6 chữ số đã gửi tới <strong>{identifier}</strong>.
      </p>

      {error.form ? (
        <p id={formErrorId} role="alert" className="form-error">
          {error.form}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor={inputId}>Mã xác thực</label>
        <input
          id={inputId}
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-invalid={codeError ? true : undefined}
          aria-describedby={codeError ? errorId : undefined}
          disabled={submitting}
          required
        />
        {codeError ? (
          <p id={errorId} role="alert" className="field-error">
            {codeError}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Đang xác thực…" : submitLabel}
      </Button>
      {onBack ? (
        <Button onClick={onBack} disabled={submitting}>
          Quay lại
        </Button>
      ) : null}
    </form>
  );
}
