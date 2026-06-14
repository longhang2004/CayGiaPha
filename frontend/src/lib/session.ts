/**
 * Session helpers built on top of the API client.
 *
 * The backend session lives in an HttpOnly cookie, so the frontend cannot read
 * the token directly. Instead it asks the backend who the current user is via
 * `GET /auth/session`; a 401 means "no active session". Sign-out delegates to
 * the backend, which revokes the session and clears the cookie.
 */

import { ApiError, api } from "./apiClient";

export interface SessionUser {
  userId: string;
  treeId: string | null;
  identifier: string;
  verified: boolean;
}

/**
 * Resolve the currently authenticated user, or `null` when there is no active
 * session (the backend responds 401).
 */
export async function getCurrentSession(
  signal?: AbortSignal,
): Promise<SessionUser | null> {
  try {
    return await api.get<SessionUser>("/auth/session", { signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

/** Terminate the current session server-side (Requirement 2.8). */
export async function signOut(): Promise<void> {
  await api.post<void>("/auth/signout");
}
