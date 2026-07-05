"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type CollaborationInvitation } from "@/lib/collaboration";

interface InvitationPageProps {
  params: {
    id: string;
  };
}

export default function PrototypeInvitationPage({ params }: InvitationPageProps) {
  const router = useRouter();
  const inviteId = params.id;

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<CollaborationInvitation | null>(null);

  useEffect(() => {
    // Mock details
    setInvitation({
      id: inviteId,
      treeId: "proto-tree",
      inviterUserId: "proto-owner",
      email: "contributor@example.com",
      code: "abc123",
      status: "approved",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    });
    setLoading(false);
  }, [inviteId]);

  if (loading) return <div>Loading…</div>;

  return (
    <main className="center-layout" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      <div className="surface-card" style={{ maxWidth: "480px", width: "100%", padding: "2.5rem", borderRadius: "16px", border: "1px solid var(--color-hairline)", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-brand)", marginBottom: "1rem" }}>
          👥 [Prototype] Cộng tác xây dựng Cây Gia Phả
        </h2>
        {invitation && (
          <div>
            <p style={{ fontSize: "1rem", lineHeight: "1.6", color: "var(--color-fg)", marginBottom: "1.5rem" }}>
              Bạn đã nhận được lời mời tham gia cộng tác biên soạn sơ đồ dòng họ từ email <strong>{invitation.email}</strong>.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-terracotta"
              style={{ width: "100%", minHeight: "44px" }}
              onClick={() => router.push(`/prototype/tree`)}
            >
              [Prototype] Đồng ý tham gia
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
