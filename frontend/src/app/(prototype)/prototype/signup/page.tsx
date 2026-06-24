"use client";

/**
 * Prototype: Sign-up — Step 1 (Region + TOS + Identifier)
 *
 * Mirrors: src/app/signup/page.tsx → identifier+TOS step of SignUpFlow
 *
 * The onSubmit handler is a no-op. Both consent checkboxes start unchecked.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When src/app/signup/page.tsx or SignUpFlow/IdentifierForm UI/UX
 * changes, update this file too.
 */

import { useState } from "react";
import { IdentifierForm } from "@/components/auth/IdentifierForm";
import { REGION_OPTIONS, type Region } from "@/lib/region";

export default function PrototypeSignUpPage() {
  const [region, setRegion] = useState<Region>("Bac");
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  return (
    <section>
      {/* ===== BEGIN: mirror of SignUpFlow — identifier+TOS step ===== */}
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
            Chọn vùng miền của bạn — điều này quyết định cách xưng hô (ví dụ
            bố/ba, mẹ/má).
          </p>
        </div>
        <div
          className="field"
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              margin: 0,
              cursor: "pointer",
              fontWeight: "normal",
              color: "var(--color-muted)",
            }}
          >
            <input
              type="checkbox"
              checked={acceptedTos}
              onChange={(e) => setAcceptedTos(e.target.checked)}
              style={{ margin: 0 }}
            />
            <span>
              Tôi đồng ý với{" "}
              <a href="/legal/tos" onClick={(e) => e.stopPropagation()}>
                Điều khoản dịch vụ
              </a>
              .
            </span>
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              margin: 0,
              cursor: "pointer",
              fontWeight: "normal",
              color: "var(--color-muted)",
            }}
          >
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              style={{ margin: 0 }}
            />
            <span>
              Tôi đồng ý với{" "}
              <a href="/legal/privacy" onClick={(e) => e.stopPropagation()}>
                Chính sách bảo mật
              </a>
              .
            </span>
          </label>
          <p className="field-hint" style={{ margin: 0 }}>
            Bạn cần đồng ý với cả hai để tạo cây gia phả.
          </p>
        </div>
        <IdentifierForm
          heading="Đăng ký"
          description="Đăng ký bằng số điện thoại (Việt Nam) hoặc email. Chúng tôi sẽ gửi mã xác thực 6 chữ số."
          submitLabel="Gửi mã xác thực"
          disabled={!acceptedTos || !acceptedPrivacy}
          onSubmit={async () => {
            /* no-op in prototype */
          }}
        />
      </div>
      {/* ===== END ===== */}
    </section>
  );
}
