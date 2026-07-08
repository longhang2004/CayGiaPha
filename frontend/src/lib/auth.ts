/**
 * Auth API helpers for the Vietnamese Family Tree frontend.
 *
 * Thin wrappers over the `/auth/*` endpoints (proxied to the Spring Boot
 * backend). Each call returns the parsed success body or throws the typed
 * `ApiError` from the API client, whose `.field` / `.message` drive the
 * field-level error messages rendered by the auth forms.
 *
 * Endpoints (see design "Auth_Service", Requirements 1 & 2):
 *   POST /auth/signup         { identifier }        -> { userId, verified }
 *   POST /auth/signup/verify  { identifier, code }  -> { userId, treeId, verified }
 *   POST /auth/signin         { identifier }        -> void
 *   POST /auth/signin/verify  { identifier, code }  -> void (sets session cookie)
 *   POST /auth/signout        -> void
 */

import { api } from "./apiClient";

/** Identity is proven by a phone number or email — never a password. */
export type Identifier = string;

export interface SignUpResponse {
  userId: string;
  verified: boolean;
}

export interface SignUpVerifyResponse {
  userId: string;
  treeId: string;
  verified: boolean;
}

/** Sign-up using identifier, password, region, and consents. */
export function signUp(
  identifier: Identifier,
  password?: string,
  region?: string,
  acceptedTos?: boolean,
  acceptedPrivacy?: boolean
): Promise<SignUpVerifyResponse> {
  return api.post<SignUpVerifyResponse>("/auth/signup", {
    identifier,
    password,
    region,
    acceptedTos,
    acceptedPrivacy,
  });
}

/** Deprecated. Use signUp directly. */
export function verifySignUp(
  identifier: Identifier,
  code: string,
  region: string | undefined,
  acceptedTos: boolean,
  acceptedPrivacy: boolean,
): Promise<SignUpVerifyResponse> {
  return Promise.resolve({ userId: "mock", treeId: "mock", verified: true });
}

/** Sign-in using identifier and password. */
export function signIn(identifier: Identifier, password?: string): Promise<void> {
  return api.post<void>("/auth/signin", { identifier, password });
}

/** Sign-in or Sign-up using Google ID Token. */
export function signInWithGoogle(
  idToken: string,
  region?: string,
  acceptedTos?: boolean,
  acceptedPrivacy?: boolean
): Promise<void> {
  return api.post<void>("/auth/google", {
    idToken,
    region,
    acceptedTos,
    acceptedPrivacy,
  });
}

/** Deprecated. Use signIn directly. */
export function verifySignIn(identifier: Identifier, code: string): Promise<void> {
  return Promise.resolve();
}

/** Terminate the current session server-side. (2.8) */
export function signOutRequest(): Promise<void> {
  return api.post<void>("/auth/signout");
}

/** Request a password reset code for the given identifier. */
export function requestPasswordReset(identifier: Identifier): Promise<void> {
  return api.post<void>("/auth/password-reset/request", { identifier });
}

/** Confirm password reset with code and new password. */
export function confirmPasswordReset(identifier: Identifier, code: string, password: string): Promise<void> {
  return api.post<void>("/auth/password-reset/confirm", { identifier, code, password });
}
