"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOCK_USER } from "@/lib/prototype/mockData";

export default function PrototypeInvitationPage() {
  const router = useRouter();
  const [requestSent, setRequestSent] = useState(false);

  return (
    <main className="center-layout invitation-page">
      {/* ===== BEGIN: mirror of invitation page ===== */}
      <section className="surface-card invitation-page__card" aria-labelledby="prototype-invitation-title">
        <h1 id="prototype-invitation-title">Bạn được mời tham gia xây dựng cây gia phả</h1>
        {requestSent ? (
          <>
            <p>Yêu cầu của bạn đã được gửi cho chủ cây để chờ duyệt</p>
            <button className="btn btn-primary" onClick={() => router.push("/prototype/tree")}>Quay về danh sách</button>
          </>
        ) : (
          <>
            <p>Hãy xác nhận nếu bạn muốn cùng gia đình xây dựng và cập nhật cây gia phả này.</p>
            <div className="account-identity invitation-account">
              <p>Tài khoản hiện tại</p>
              <p className="account-identity__primary"><strong>{MOCK_USER.displayName || MOCK_USER.identifier}</strong></p>
              {MOCK_USER.displayName ? <p className="account-identity__secondary">{MOCK_USER.identifier}</p> : null}
            </div>
            <div className="invitation-page__actions">
              <button className="btn btn-primary" onClick={() => setRequestSent(true)}>Yêu cầu tham gia</button>
              <button className="btn btn-secondary" onClick={() => router.push("/prototype/tree")}>Huỷ bỏ</button>
            </div>
          </>
        )}
      </section>
      {/* ===== END ===== */}
    </main>
  );
}
