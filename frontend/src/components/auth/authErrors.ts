/**
 * Helpers for turning a thrown error from an auth API call into accessible,
 * field-level messages.
 *
 * The backend error envelope is surfaced as `ApiError` with an optional
 * `.field` (e.g. "identifier", "code") and a human `.message`. When the error
 * names a field we render the message against that input (associated via
 * `aria-describedby`, with `aria-invalid` set); otherwise we render it as a
 * form-level message.
 */

import { ApiError } from "@/lib/apiClient";

export interface AuthErrorState {
  /** Error tied to a specific input, keyed by the field name from the envelope. */
  field?: { name: string; message: string };
  /** Error not tied to a specific input (network failures, generic codes). */
  form?: string;
}

const GENERIC_MESSAGE = "Đã xảy ra lỗi. Vui lòng thử lại.";

/**
 * Map any thrown error to an {@link AuthErrorState}. A field-scoped `ApiError`
 * becomes a field error; everything else becomes a form-level message.
 */
export function toAuthErrorState(error: unknown): AuthErrorState {
  if (error instanceof ApiError) {
    if (error.field) {
      return { field: { name: error.field, message: error.message } };
    }
    return { form: error.message };
  }
  if (error instanceof Error && error.message) {
    return { form: error.message };
  }
  return { form: GENERIC_MESSAGE };
}

export function fieldErrorFor(
  state: AuthErrorState,
  fieldName: string,
): string | undefined {
  return state.field?.name === fieldName ? state.field.message : undefined;
}

export function unmappedFieldError(
  state: AuthErrorState,
  knownFields: string[],
): string | undefined {
  if (state.field && !knownFields.includes(state.field.name)) {
    return state.field.message;
  }
  return undefined;
}
