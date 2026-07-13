"use client";

import { ConsentReacceptanceDialog } from "@/components/legal/ConsentReacceptanceDialog";
import { MOCK_USER } from "@/lib/prototype/mockData";
import { MockSessionProvider } from "@/lib/prototype/mockSession";

export default function PrototypeConsentPage() {
  return (
    <MockSessionProvider user={{ ...MOCK_USER, consentRequired: true }}>
      {/* ===== BEGIN: mirror of ConsentReacceptanceDialog mounted by AppLayoutWrapper ===== */}
      <main className="center-state">
        <div className="center-state__card">
          <h1>Không gian gia đình</h1>
          <p>Trạng thái mẫu khi người dùng cần chấp thuận lại tài liệu pháp lý hiện tại.</p>
        </div>
      </main>
      <ConsentReacceptanceDialog acknowledge={async () => undefined} />
      {/* ===== END: mirror of ConsentReacceptanceDialog mounted by AppLayoutWrapper ===== */}
    </MockSessionProvider>
  );
}
