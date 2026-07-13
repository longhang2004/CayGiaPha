"use client";

import { useState } from "react";
import { ClaimFlow } from "@/components/claim/ClaimFlow";
import { MOCK_USER } from "@/lib/prototype/mockData";

export default function PrototypeClaimPage({ params }: { params: { personId: string } }) {
  const [openedTree, setOpenedTree] = useState(false);

  return (
    <main className="center-layout claim-page">
      {/* ===== BEGIN: mirror of claim page ===== */}
      <section className="surface-card claim-page__card" aria-labelledby="prototype-claim-title">
        <p className="eyebrow">Liên kết hồ sơ gia đình</p>
        <h1 id="prototype-claim-title">Xác nhận đây là tôi</h1>
        <p>
          Nhập mã 6 chữ số đã được gửi cho tài khoản <strong>{MOCK_USER.identifier}</strong>.
          Hệ thống chỉ liên kết hồ sơ khi địa chỉ nhận mã khớp với tài khoản đang đăng nhập.
        </p>
        {openedTree ? (
          <p role="status">Đã xác nhận. Đang mở cây gia phả mẫu…</p>
        ) : (
          <ClaimFlow
            mode="verify"
            personId={params.personId}
            verifyAction={async () => ({
              personId: params.personId,
              treeId: "prototype-tree",
              claimed: true,
            })}
            onClaimed={() => setOpenedTree(true)}
          />
        )}
      </section>
      {/* ===== END ===== */}
    </main>
  );
}
