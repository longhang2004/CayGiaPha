"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { ClaimFlow } from "@/components/claim/ClaimFlow";
import { buildAuthHref } from "@/lib/authRedirect";

export default function ClaimPage({ params }: { params: { personId: string } }) {
  const router = useRouter();
  const { user, loading } = useSession();
  const returnPath = `/claim/${params.personId}`;

  useEffect(() => {
    if (!loading && !user) {
      router.push(buildAuthHref("/signin", returnPath, "claim"));
    }
  }, [loading, returnPath, router, user]);

  if (loading || !user) {
    return (
      <section className="center-state" aria-live="polite">
        <div className="center-state__card">
          <span className="center-state__spinner" aria-hidden="true" />
          <p>Đang xác thực tài khoản…</p>
        </div>
      </section>
    );
  }

  return (
    <main className="center-layout claim-page">
      <section className="surface-card claim-page__card" aria-labelledby="claim-page-title">
        <p className="eyebrow">Liên kết hồ sơ gia đình</p>
        <h1 id="claim-page-title">Xác nhận đây là tôi</h1>
        <p>
          Nhập mã 6 chữ số đã được gửi cho tài khoản <strong>{user.identifier}</strong>.
          Hệ thống chỉ liên kết hồ sơ khi địa chỉ nhận mã khớp với tài khoản đang đăng nhập.
        </p>
        <ClaimFlow
          mode="verify"
          personId={params.personId}
          onClaimed={(result) => router.push(`/tree/${result.treeId}`)}
        />
      </section>
    </main>
  );
}
