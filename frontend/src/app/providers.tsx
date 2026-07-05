"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentSession, signOut, type SessionUser } from "@/lib/session";
import { GoogleOAuthProvider } from "@react-oauth/google";

export interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * Client-side session provider. Loads the current session on mount and exposes
 * it to the component tree. The actual session token stays in an HttpOnly
 * cookie managed by the backend.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setUser(await getCurrentSession());
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await signOut();
    setUser(null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ user, loading, refresh, logout }),
    [user, loading],
  );

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
    </GoogleOAuthProvider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
