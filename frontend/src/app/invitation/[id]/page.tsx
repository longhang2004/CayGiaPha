"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { useToast } from "@/components/ui/ToastProvider";
import { getInvitationDetails, joinTreeWithLink, type InvitationView } from "@/lib/collaboration";
import { buildAuthHref } from "@/lib/authRedirect";

export default function InvitationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const { showToast } = useToast();
  const [invitation, setInvitation] = useState<InvitationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.push(buildAuthHref("/signin", `/invitation/${params.id}`, "invitation"));
      return;
    }
    setLoading(true);
    getInvitationDetails(params.id)
      .then((details) => {
        setInvitation(details);
        setRequestSent(details.status === "pending");
      })
      .catch(() => {
        setInvalid(true);
        showToast("Lời mời không hợp lệ", "error");
      })
      .finally(() => setLoading(false));
    // router and showToast are stable application contexts; excluding their wrapper
    // objects avoids re-fetching when test/router adapters recreate those wrappers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, sessionLoading, user]);

  async function handleJoin() {
    setJoining(true);
    try {
      const result = await joinTreeWithLink(params.id);
      if ("status" in result && result.status === "pending") setRequestSent(true);
      else if (invitation) router.push(`/tree/${invitation.treeId}`);
    } catch {
      setInvalid(true);
      showToast("Lời mời không hợp lệ", "error");
    } finally {
      setJoining(false);
    }
  }

  if (sessionLoading || loading || !user) {
    return <section className="center-state" aria-live="polite"><div className="center-state__card"><span className="center-state__spinner" aria-hidden="true" /><p>Đang xác thực thông tin lời mời…</p></div></section>;
  }

  return (
    <main className="center-layout invitation-page">
      <section className="surface-card invitation-page__card" aria-labelledby="invitation-title">
        <h1 id="invitation-title">Bạn được mời tham gia xây dựng cây gia phả</h1>
        {invalid ? (
          <><p>Lời mời không hợp lệ</p><button className="btn btn-secondary" onClick={() => router.push("/tree")}>Quay về danh sách</button></>
        ) : requestSent ? (
          <><p>Yêu cầu của bạn đã được gửi cho chủ cây để chờ duyệt</p><button className="btn btn-primary" onClick={() => router.push("/tree")}>Quay về danh sách</button></>
        ) : invitation?.status === "joined" ? (
          <><p>Bạn đã là cộng tác viên của cây này.</p><button className="btn btn-primary" onClick={() => router.push(`/tree/${invitation.treeId}`)}>Mở cây gia phả</button></>
        ) : invitation?.status === "rejected" || invitation?.status === "expired" ? (
          <><p>Lời mời không hợp lệ</p><button className="btn btn-secondary" onClick={() => router.push("/tree")}>Quay về danh sách</button></>
        ) : (
          <>
            <p>Hãy xác nhận nếu bạn muốn cùng gia đình xây dựng và cập nhật cây gia phả này.</p>
            <div className="account-identity invitation-account">
              <p>Tài khoản hiện tại</p>
              <p className="account-identity__primary"><strong>{user.displayName?.trim() || user.identifier}</strong></p>
              {user.displayName?.trim() ? <p className="account-identity__secondary">{user.identifier}</p> : null}
            </div>
            <div className="invitation-page__actions">
              <button className="btn btn-primary" onClick={handleJoin} disabled={joining}>{joining ? "Đang gửi…" : invitation?.invitationType === "generic" ? "Yêu cầu tham gia" : "Chấp nhận lời mời"}</button>
              <button className="btn btn-secondary" onClick={() => router.push("/tree")} disabled={joining}>Huỷ bỏ</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
