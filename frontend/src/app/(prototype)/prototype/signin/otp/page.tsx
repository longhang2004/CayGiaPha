"use client";

/**
 * Prototype: Sign-in — Step 2 (OTP)
 *
 * Mirrors: src/app/signin/page.tsx → OtpForm step of SignInFlow
 *
 * Renders with a pre-filled identifier so the OTP step is visible immediately.
 * onSubmit is a no-op.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When SignInFlow/OtpForm UI/UX changes, update this file too.
 */

import { OtpForm } from "@/components/auth/OtpForm";

export default function PrototypeSignInOtpPage() {
  return (
    <section>
      {/* ===== BEGIN: mirror of SignInFlow — OTP step ===== */}
      <OtpForm
        heading="Xác thực đăng nhập"
        identifier="prototype@caygipha.dev"
        submitLabel="Đăng nhập"
        onSubmit={async () => {
          /* no-op in prototype */
        }}
        onBack={() => {
          /* no-op in prototype */
        }}
      />
      {/* ===== END ===== */}
    </section>
  );
}
