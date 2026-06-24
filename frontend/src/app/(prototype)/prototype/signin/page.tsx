"use client";

/**
 * Prototype: Sign-in — Step 1 (Identifier)
 *
 * Mirrors: src/app/signin/page.tsx → IdentifierForm step of SignInFlow
 *
 * The onSubmit handler is a no-op so no API call is made.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When src/app/signin/page.tsx or SignInFlow/IdentifierForm UI/UX
 * changes, update this file too.
 */

import { IdentifierForm } from "@/components/auth/IdentifierForm";

export default function PrototypeSignInPage() {
  return (
    <section>
      {/* ===== BEGIN: mirror of SignInFlow — identifier step ===== */}
      <IdentifierForm
        heading="Đăng nhập"
        description="Đăng nhập bằng số điện thoại hoặc email. Chúng tôi sẽ gửi mã xác thực 6 chữ số."
        submitLabel="Gửi mã xác thực"
        onSubmit={async () => {
          /* no-op in prototype */
        }}
      />
      {/* ===== END ===== */}
    </section>
  );
}
