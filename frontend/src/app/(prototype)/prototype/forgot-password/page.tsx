"use client";

import { useState } from "react";
import { ForgotPasswordFlow } from "@/components/auth/ForgotPasswordFlow";

export default function PrototypeForgotPasswordPage() {
  const [completed, setCompleted] = useState(false);

  return (
    <div className="auth-container">
      {/* ===== BEGIN: mirror of src/app/forgot-password/page.tsx / ForgotPasswordFlow ===== */}
      {completed ? (
        <div className="auth-wrapper" role="status">
          <div className="double-bezel-card" style={{ width: "100%" }}>
            <div className="double-bezel-card__inner">
              <h1>Đã cập nhật mật khẩu</h1>
              <p>Phiên mẫu đã hoàn tất và sẽ chuyển về danh sách cây.</p>
            </div>
          </div>
        </div>
      ) : (
        <ForgotPasswordFlow
          requestAction={async () => undefined}
          confirmAction={async () => undefined}
          onComplete={() => setCompleted(true)}
        />
      )}
      {/* ===== END: mirror of src/app/forgot-password/page.tsx / ForgotPasswordFlow ===== */}
    </div>
  );
}
