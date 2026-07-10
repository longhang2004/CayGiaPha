"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import {
  fieldErrorFor,
  toAuthErrorState,
  type AuthErrorState,
} from "./authErrors";

interface IdentifierFormProps {
  /** Heading-level label describing the step (e.g. "Đăng ký"). */
  heading: string;
  /** Helper text describing what to enter. */
  description: string;
  /** Submit-button label. */
  submitLabel: string;
  /**
   * Called with the trimmed identifier when the form is submitted. Should throw
   * an `ApiError` (or any Error) on failure so field/form errors can render.
   */
  onSubmit: (identifier: string) => Promise<void>;
  /** When true, the submit button is disabled (e.g. required consent not yet given). */
  disabled?: boolean;
}

/**
 * First step of the sign-up / sign-in flows: collect a Vietnamese phone number
 * or email. Field-level validation errors from the backend envelope render
 * against this input (associated via `aria-describedby`, `aria-invalid`).
 * (Requirements 1.1, 1.2, 2.1)
 */
export function IdentifierForm({
  heading,
  description,
  submitLabel,
  onSubmit,
  disabled = false,
}: IdentifierFormProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const formErrorId = `${inputId}-form-error`;

  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<AuthErrorState>({});
  const [submitting, setSubmitting] = useState(false);

  const identifierError = fieldErrorFor(error, "identifier");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError({});
    setSubmitting(true);
    try {
      await onSubmit(identifier.trim());
    } catch (caught) {
      setError(toAuthErrorState(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={`${inputId}-heading`}>
      <h1 id={`${inputId}-heading`}>{heading}</h1>
      <p>{description}</p>

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

      <Button type="submit" disabled={disabled} loading={submitting} loadingLabel="Đang gửi…">
        {submitLabel}
      </Button>
    </form>
  );
}
