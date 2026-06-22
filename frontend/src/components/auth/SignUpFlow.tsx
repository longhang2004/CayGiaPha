"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { signUp, verifySignUp } from "@/lib/auth";
import { REGION_OPTIONS, type Region } from "@/lib/region";
import { IdentifierForm } from "./IdentifierForm";
import { OtpForm } from "./OtpForm";

interface SignUpFlowProps {
  /** Where to navigate after a verified sign-up. Defaults to the app home. */
  redirectTo?: string;
}

/**
 * Sign-up flow: collect the owner's region and an identifier, trigger an OTP send,
 * then verify the 6-digit code. On successful verification the backend creates the
 * user's tree with the chosen region (Requirement 9.2) and the account is verified;
 * we refresh session state and route into the app. (Requirements 1.1, 1.2, 1.3, 9.2)
 */
export function SignUpFlow({ redirectTo = "/" }: SignUpFlowProps) {
  const router = useRouter();
  const { refresh } = useSession();
  const [identifier, setIdentifier] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>("Bac");
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  async function handleIdentifier(value: string) {
    if (!acceptedTos || !acceptedPrivacy) {
      throw new Error("Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật để tiếp tục.");
    }
    await signUp(value);
    setIdentifier(value);
  }

  async function handleCode(code: string) {
    await verifySignUp(identifier as string, code, region, acceptedTos, acceptedPrivacy);
    await refresh();
    router.push(redirectTo);
  }

  if (identifier === null) {
    return (
      <div>
        <div className="field" style={{ marginBottom: "1rem" }}>
          <label htmlFor="signup-region">Vùng miền (cách xưng hô)</label>
          <select
            id="signup-region"
            value={region}
            onChange={(e) => setRegion(e.target.value as Region)}
          >
            {REGION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="field-hint">
            Chọn vùng miền của bạn — điều này quyết định cách xưng hô (ví dụ bố/ba, mẹ/má).
          </p>
        </div>
        <div className="field" style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)" }}>
            <input
              type="checkbox"
              checked={acceptedTos}
              onChange={(e) => setAcceptedTos(e.target.checked)}
              style={{ margin: 0 }}
            />
            <span>Tôi đồng ý với <a href="/legal/tos" onClick={(e) => e.stopPropagation()}>Điều khoản dịch vụ</a>.</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)" }}>
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              style={{ margin: 0 }}
            />
            <span>Tôi đồng ý với <a href="/legal/privacy" onClick={(e) => e.stopPropagation()}>Chính sách bảo mật</a>.</span>
          </label>
          <p className="field-hint" style={{ margin: 0 }}>
            Bạn cần đồng ý với cả hai để tạo cây gia phả.
          </p>
        </div>
        <IdentifierForm
          heading="Đăng ký"
          description="Đăng ký bằng số điện thoại (Việt Nam) hoặc email. Chúng tôi sẽ gửi mã xác thực 6 chữ số."
          submitLabel="Gửi mã xác thực"
          onSubmit={handleIdentifier}
        />
      </div>
    );
  }

  return (
    <OtpForm
      heading="Xác thực đăng ký"
      identifier={identifier}
      submitLabel="Xác thực"
      onSubmit={handleCode}
      onBack={() => setIdentifier(null)}
    />
  );
}
