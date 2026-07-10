"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getInvitationDetails, joinTreeWithLink, type CollaborationInvitation } from "@/lib/collaboration";
import { useSession } from "@/app/providers";

interface InvitationPageProps {
  params: {
    id: string;
  };
}

export default function InvitationPage({ params }: InvitationPageProps) {
  const router = useRouter();
  const inviteId = params.id;

  const { user, loading: sessionLoading } = useSession();
  const [invitation, setInvitation] = useState<CollaborationInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for session resolution so anonymous users see sign-in CTA instead of a hard error.
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      setInvitation(null);
      setError(null);
      return;
    }
    setLoading(true);
    getInvitationDetails(inviteId)
      .then((details) => {
        setInvitation(details);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Lời mời không tồn tại hoặc bạn không có quyền xem.");
        setLoading(false);
      });
  }, [inviteId, sessionLoading, user]);

  const handleJoin = async () => {
    if (!invitation) return;
    setJoining(true);
    setError(null);
    try {
      await joinTreeWithLink(inviteId);
      // Canonical workspace route is /tree/[id]
      router.push(`/tree/${invitation.treeId}`);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi tham gia cây.");
      setJoining(false);
    }
  };

  const handleSignInRedirect = () => {
    router.push(`/signin?redirect=/invitation/${inviteId}`);
  };

  if (loading || sessionLoading) {
    return (
      <section className="center-state" aria-live="polite">
        <div className="center-state__card">
          <span className="center-state__spinner" aria-hidden="true" />
          <p>Đang xác thực thông tin lời mời…</p>
        </div>
      </section>
    );
  }

  return (
    <main className="center-layout" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      <div className="surface-card" style={{ maxWidth: "480px", width: "100%", padding: "2.5rem", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)", border: "1px solid var(--color-hairline)", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-brand)", marginBottom: "1rem" }}>
          👥 Cộng tác xây dựng Cây Gia Phả
        </h2>

        {!user && !sessionLoading ? (
          <div>
            <p style={{ fontSize: "1rem", lineHeight: "1.6", color: "var(--color-fg)", marginBottom: "1.5rem" }}>
              Bạn đã nhận được lời mời cộng tác xây dựng cây gia phả. Vui lòng đăng nhập hoặc đăng ký
              để xem chi tiết và chấp nhận.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-primary btn-terracotta"
                style={{ width: "100%", minHeight: "44px" }}
                onClick={handleSignInRedirect}
              >
                Đăng nhập để tham gia
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%", minHeight: "44px" }}
                onClick={() => router.push(`/signup?redirect=/invitation/${inviteId}`)}
              >
                Đăng ký tài khoản mới
              </button>
            </div>
          </div>
        ) : error ? (
          <div style={{ margin: "1.5rem 0" }}>
            <p style={{ color: "red", fontSize: "0.95rem", marginBottom: "1.5rem" }}>{error}</p>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "100%" }}
              onClick={() => router.push("/")}
            >
              Về trang chủ
            </button>
          </div>
        ) : (
          invitation && (
            <div>
              <p style={{ fontSize: "1rem", lineHeight: "1.6", color: "var(--color-fg)", marginBottom: "1.5rem" }}>
                Bạn đã nhận được lời mời tham gia cộng tác biên soạn sơ đồ dòng họ
                {invitation.email ? (
                  <>
                    {" "}
                    gửi tới <strong>{invitation.email}</strong>
                  </>
                ) : null}
                .
              </p>

              {invitation.status === "joined" ? (
                <div>
                  <p style={{ fontSize: "0.95rem", color: "var(--color-muted)", marginBottom: "1.5rem" }}>
                    Lời mời này đã được chấp nhận. Bạn có thể mở cây gia phả nếu đã là cộng tác viên.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-terracotta"
                    style={{ width: "100%", minHeight: "44px" }}
                    onClick={() => router.push(`/tree/${invitation.treeId}`)}
                  >
                    Mở cây gia phả
                  </button>
                </div>
              ) : invitation.status === "pending" ? (
                <p style={{ fontSize: "0.95rem", color: "var(--color-muted)", marginBottom: "1.5rem" }}>
                  Yêu cầu tham gia đang chờ chủ cây duyệt. Vui lòng quay lại sau.
                </p>
              ) : invitation.status === "rejected" || invitation.status === "expired" ? (
                <p style={{ fontSize: "0.95rem", color: "var(--color-danger)", marginBottom: "1.5rem" }}>
                  Lời mời không còn hiệu lực ({invitation.status}).
                </p>
              ) : user ? (
                <div>
                  {(() => {
                    const primaryLabel =
                      user.displayName?.trim() || user.identifier || "Người dùng";
                    return (
                      <div className="account-identity invitation-account" style={{ marginBottom: "2rem" }}>
                        <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", margin: "0 0 0.35rem" }}>
                          Tài khoản hiện tại
                        </p>
                        <p className="account-identity__primary" style={{ fontSize: "1rem", margin: 0, wordBreak: "break-word" }}>
                          <strong>{primaryLabel}</strong>
                        </p>
                        {user.displayName?.trim() ? (
                          <p className="account-identity__secondary" style={{ fontSize: "0.85rem", color: "var(--color-muted)", margin: "0.25rem 0 0", wordBreak: "break-word" }}>
                            {user.identifier}
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}
                  <button
                    type="button"
                    className="btn btn-primary btn-terracotta"
                    style={{ width: "100%", minHeight: "44px" }}
                    onClick={handleJoin}
                    disabled={joining}
                  >
                    {joining ? "Đang tham gia…" : "Chấp nhận lời mời & Đồng ý tham gia"}
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "0.9rem", color: "var(--color-muted)", marginBottom: "2rem" }}>
                    Vui lòng đăng nhập hoặc đăng ký tài khoản mới để chấp nhận lời mời cộng tác này.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-terracotta"
                      style={{ width: "100%", minHeight: "44px" }}
                      onClick={handleSignInRedirect}
                    >
                      Đăng nhập để tham gia
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "100%", minHeight: "44px" }}
                      onClick={() => router.push(`/signup?redirect=/invitation/${inviteId}`)}
                    >
                      Đăng ký tài khoản mới
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </main>
  );
}
