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

/** Start sign-up: create an unverified account and trigger an OTP send. (1.1–1.3) */
export function signUp(identifier: Identifier): Promise<SignUpResponse> {
  return api.post<SignUpResponse>("/auth/signup", { identifier });
}

/** Complete sign-up by submitting the 6-digit code; creates the user's tree. (1.4, 13.1)
 *
 * An optional `region` (Bac/Trung/Nam) chooses the tree's regional dialect at creation
 * (Requirement 9.2); when omitted the backend defaults to Bắc. The owner must accept the current
 * Terms of Service and Privacy Policy (Requirement 23.2/23.3); the backend refuses to create the
 * account otherwise. */
export function verifySignUp(
  identifier: Identifier,
  code: string,
  region: string | undefined,
  acceptedTos: boolean,
  acceptedPrivacy: boolean,
): Promise<SignUpVerifyResponse> {
  return api.post<SignUpVerifyResponse>("/auth/signup/verify", {
    identifier,
    code,
    ...(region ? { region } : {}),
    acceptedTos,
    acceptedPrivacy,
  });
}

/** Request a sign-in code for a verified identifier. (2.1, 2.4) */
export function signIn(identifier: Identifier): Promise<void> {
  return api.post<void>("/auth/signin", { identifier });
}

/** Submit the sign-in code; on success the backend establishes the session cookie. (2.3) */
export function verifySignIn(identifier: Identifier, code: string): Promise<void> {
  return api.post<void>("/auth/signin/verify", { identifier, code });
}

/** Terminate the current session server-side. (2.8) */
export function signOutRequest(): Promise<void> {
  return api.post<void>("/auth/signout");
}
