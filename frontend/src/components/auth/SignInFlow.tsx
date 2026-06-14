"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { signIn, verifySignIn } from "@/lib/auth";
import { IdentifierForm } from "./IdentifierForm";
import { OtpForm } from "./OtpForm";

interface SignInFlowProps {
  /** Where to navigate after a successful sign-in. Defaults to the app home. */
  redirectTo?: string;
}

/**
 * Sign-in flow: request a code for a verified identifier, then submit the
 * 6-digit code. On success the backend sets the session cookie; we refresh
 * session state and route into the app. (Requirements 2.1, 2.3)
 */
export function SignInFlow({ redirectTo = "/" }: SignInFlowProps) {
  const router = useRouter();
  const { refresh } = useSession();
  const [identifier, setIdentifier] = useState<string | null>(null);

  async function handleIdentifier(value: string) {
    await signIn(value);
    setIdentifier(value);
  }

  async function handleCode(code: string) {
    await verifySignIn(identifier as string, code);
    await refresh();
    router.push(redirectTo);
  }

  if (identifier === null) {
    return (
      <IdentifierForm
        heading="Đăng nhập"
        description="Đăng nhập bằng số điện thoại hoặc email. Chúng tôi sẽ gửi mã xác thực 6 chữ số."
        submitLabel="Gửi mã xác thực"
        onSubmit={handleIdentifier}
      />
    );
  }

  return (
    <OtpForm
      heading="Xác thực đăng nhập"
      identifier={identifier}
      submitLabel="Đăng nhập"
      onSubmit={handleCode}
      onBack={() => setIdentifier(null)}
    />
  );
}
