"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useSession } from "@/app/providers";

interface SignOutButtonProps {
  /** Where to navigate after signing out. Defaults to the sign-in page. */
  redirectTo?: string;
}

/**
 * Sign-out control. Delegates to the session provider's `logout`, which calls
 * the backend to terminate and invalidate the session, then routes away from
 * authenticated content. (Requirement 2.8)
 */
export function SignOutButton({ redirectTo = "/signin" }: SignOutButtonProps) {
  const router = useRouter();
  const { logout } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    try {
      await logout();
      router.push(redirectTo);
    } catch {
      setError("Không thể đăng xuất. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <Button onClick={handleClick} disabled={submitting}>
        {submitting ? "Đang đăng xuất…" : "Đăng xuất"}
      </Button>
    </>
  );
}
