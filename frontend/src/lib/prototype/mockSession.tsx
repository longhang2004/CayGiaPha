"use client";

/**
 * MockSessionProvider — provides a fake session to the real `SessionContext`
 * so any component calling `useSession()` (from @/app/providers) works without
 * a real backend session.
 *
 * ⚠️  PROTOTYPE ONLY — only import from prototype pages.
 */

import { useMemo, type ReactNode } from "react";
import {
  SessionContext,
  type SessionContextValue,
} from "@/app/providers";
import type { SessionUser } from "@/lib/session";
import { MOCK_USER } from "./mockData";

export function MockSessionProvider({
  children,
  user = MOCK_USER,
}: {
  children: ReactNode;
  /** Override the mock user (e.g. pass null to simulate logged-out). */
  user?: SessionUser | null;
}) {
  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loading: false,
      refresh: async () => {},
      logout: async () => {},
    }),
    [user],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
