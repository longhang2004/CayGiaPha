"use client";

/**
 * Prototype: Sign-up — Step 2 (OTP)
 *
 * Mirrors: src/app/signup/page.tsx → OtpForm step of SignUpFlow
 *
 * Renders the OTP verification form with a pre-filled identifier.
 * onSubmit is a no-op.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When SignUpFlow/OtpForm UI/UX changes, update this file too.
 */

import { OtpForm } from "@/components/auth/OtpForm";

export default function PrototypeSignUpOtpPage() {
  return (
    <section>
      {/* ===== BEGIN: mirror of SignUpFlow — OTP step ===== */}
      <OtpForm
        heading="Xác thực đăng ký"
        identifier="prototype@caygipha.dev"
        submitLabel="Xác thực"
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
