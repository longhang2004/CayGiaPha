import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { useToast } from "@/components/ui/ToastProvider";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/FormControls";
import { ApiError } from "@/lib/apiClient";
import {
  inviteCollaborator,
  createInviteLink,
  getPendingInvitations,
  approveInvitation,
  rejectInvitation,
  joinTreeGroup,
  getCollaborators,
  type CollaborationInvitation,
  type TreeCollaborator
} from "@/lib/collaboration";

export interface CollaborationAdapter {
  getCollaborators: (treeId: string) => Promise<TreeCollaborator[]>;
  getPendingInvitations: (treeId: string) => Promise<CollaborationInvitation[]>;
  inviteCollaborator: (treeId: string, email: string) => Promise<{ status: string, code?: string, emailSent?: boolean, emailMessage?: string }>;
  createInviteLink: (treeId: string) => Promise<{ code: string }>;
  approveInvitation: (treeId: string, inviteId: string) => Promise<void>;
  rejectInvitation: (treeId: string, inviteId: string) => Promise<void>;
  joinTreeGroup: (code: string) => Promise<TreeCollaborator | CollaborationInvitation>;
}

const defaultAdapter: CollaborationAdapter = {
  getCollaborators,
  getPendingInvitations,
  inviteCollaborator,
  createInviteLink,
  approveInvitation,
  rejectInvitation,
  joinTreeGroup,
};

export interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  treeId: string;
  isOwner: boolean;
  adapter?: CollaborationAdapter;
  isPrototype?: boolean;
}

export function CollaborationModal({ isOpen, onClose, treeId, isOwner, adapter = defaultAdapter, isPrototype }: CollaborationModalProps) {
  const { user } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [collaborators, setCollaborators] = useState<TreeCollaborator[]>([]);
  const [pendingInvites, setPendingInvites] = useState<CollaborationInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedInviteCode, setGeneratedInviteCode] = useState("");
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [collaborationAction, setCollaborationAction] = useState<string | null>(null);

  const fetchCollaborationData = useCallback(async (signal?: AbortSignal) => {
    if (!treeId || !user || !isOpen) return;
    setLoadingCollaborators(true);
    try {
      const collabs = await adapter.getCollaborators(treeId);
      if (signal?.aborted) return;
      setCollaborators(collabs);

      if (isOwner) {
        const pendings = await adapter.getPendingInvitations(treeId);
        if (signal?.aborted) return;
        setPendingInvites(pendings);
      }
    } catch (err) {
      console.error("Failed to load collaboration data", err);
    } finally {
      if (!signal?.aborted) setLoadingCollaborators(false);
    }
  }, [treeId, user, isOpen, isOwner, adapter]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchCollaborationData(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [fetchCollaborationData]);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!treeId || !inviteEmail.trim()) return;
    setCollaborationAction("invite");
    try {
      const result = await adapter.inviteCollaborator(treeId, inviteEmail.trim());
      if (result.emailMessage) {
        showToast(result.emailMessage, result.emailSent ? "success" : "error");
      } else if (result.status === "approved") {
        showToast(
          `Đã tạo lời mời (mã ${result.code}). Nếu email không tới, kiểm tra cấu hình EMAIL_* trên server và hộp thư rác.`,
          "info",
        );
      } else {
        showToast("Đã gửi yêu cầu tham gia. Đang chờ chủ cây duyệt.", "info");
      }
      setInviteEmail("");
      fetchCollaborationData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Không thể gửi lời mời.", "error");
    } finally {
      setCollaborationAction(null);
    }
  }

  async function handleCreateGenericInvite() {
    if (!treeId) return;
    setCollaborationAction("generate");
    try {
      const result = await adapter.createInviteLink(treeId);
      setGeneratedInviteCode(result.code);
      showToast(`Đã tạo mã mời: ${result.code}`, "success");
      fetchCollaborationData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Không thể tạo mã mời.", "error");
    } finally {
      setCollaborationAction(null);
    }
  }

  async function handleApproveInvite(inviteId: string) {
    if (!treeId) return;
    setCollaborationAction(`approve:${inviteId}`);
    try {
      await adapter.approveInvitation(treeId, inviteId);
      showToast("Đã duyệt lời mời cộng tác thành công!", "success");
      fetchCollaborationData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Thao tác thất bại.", "error");
    } finally {
      setCollaborationAction(null);
    }
  }

  async function handleRejectInvite(inviteId: string) {
    if (!treeId) return;
    setCollaborationAction(`reject:${inviteId}`);
    try {
      await adapter.rejectInvitation(treeId, inviteId);
      showToast("Đã từ chối/hủy lời mời cộng tác!", "success");
      fetchCollaborationData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Thao tác thất bại.", "error");
    } finally {
      setCollaborationAction(null);
    }
  }

  async function handleJoinTree(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setCollaborationAction("join");
    try {
      const result = await adapter.joinTreeGroup(inviteCode.trim());
      if ("status" in result && result.status === "pending") {
        showToast("Yêu cầu của bạn đã được gửi. Vui lòng chờ chủ cây duyệt.", "info");
      } else {
        showToast("Bạn đã tham gia nhóm cộng tác xây dựng cây thành công!", "success");
      }
      setInviteCode("");
      if (!isPrototype) {
        router.refresh();
        window.location.reload();
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Mã mời không hợp lệ.", "error");
    } finally {
      setCollaborationAction(null);
    }
  }

  return (
    <Modal className="collaboration-modal" isOpen={isOpen} onClose={onClose} aria-label="Quản lý cộng tác viên">
      <ModalHeader title="Quản lý cộng tác viên" onClose={onClose} />
      <ModalBody>
        <section className="settings-section">
          <h3>Thành viên hiện tại</h3>
          <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Card style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--color-brand)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.9rem" }}>
                C
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Chủ cây (Owner)</div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>Quyền cao nhất</div>
              </div>
            </Card>
            {collaborators.map((c) => (
              <Card key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--color-surface-hover)", color: "var(--color-fg)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.9rem" }}>
                  {(c.displayName || c.userId).substring(0, 1).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{c.displayName || c.userId}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                    {c.role === "owner" ? <Badge variant="brand">Chủ cây</Badge> : <Badge variant="neutral">Cộng tác viên</Badge>}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {isOwner && (
            <form onSubmit={handleSendInvite} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem", borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1.5rem" }}>
              <label htmlFor="invite-email" style={{ fontWeight: "bold" }}>Thêm cộng tác viên mới</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-secondary" disabled={collaborationAction !== null} aria-busy={collaborationAction === "invite" || undefined}>
                  {collaborationAction === "invite" ? <><span className="btn__spinner" aria-hidden="true" />Đang gửi mail…</> : "Mời"}
                </button>
              </div>
            </form>
          )}

          {isOwner && (
            <div style={{ marginBottom: "1.5rem", borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontWeight: "bold" }}>Tạo mã mời chia sẻ</label>
              <p style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                Tạo mã mời chung để những người khác có thể tự tham gia (cần được bạn duyệt).
              </p>
              {generatedInviteCode ? (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <Input value={generatedInviteCode} readOnly style={{ flex: 1, fontWeight: "bold", letterSpacing: "1px" }} />
                  <button type="button" className="btn" onClick={() => {
                    navigator.clipboard.writeText(generatedInviteCode);
                    showToast("Đã sao chép mã mời!", "success");
                  }}>
                    Copy
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={handleCreateGenericInvite} disabled={collaborationAction !== null} aria-busy={collaborationAction === "generate" || undefined} style={{ alignSelf: "flex-start" }}>
                  {collaborationAction === "generate" ? <><span className="btn__spinner" aria-hidden="true" />Đang tạo…</> : "Tạo mã mời"}
                </button>
              )}
            </div>
          )}

          {isOwner && pendingInvites.length > 0 && (
            <div style={{ marginBottom: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--color-hairline-soft)" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--color-danger)" }}>Đang chờ duyệt ({pendingInvites.length} yêu cầu):</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {pendingInvites.map((invite) => (
                  <Card key={invite.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderLeftWidth: "4px", borderLeftColor: "var(--color-danger)" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{invite.email}</span>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button type="button" className="btn" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleApproveInvite(invite.id)} disabled={collaborationAction !== null} aria-busy={collaborationAction === `approve:${invite.id}` || undefined}>
                        {collaborationAction === `approve:${invite.id}` ? <span className="btn__spinner" aria-hidden="true" /> : "Duyệt"}
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleRejectInvite(invite.id)} disabled={collaborationAction !== null} aria-busy={collaborationAction === `reject:${invite.id}` || undefined}>
                        {collaborationAction === `reject:${invite.id}` ? <span className="btn__spinner" aria-hidden="true" /> : "Từ chối"}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {user && (
            <form onSubmit={handleJoinTree} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px dashed var(--color-hairline-soft)", paddingTop: "1.5rem" }}>
              <label htmlFor="invite-code" style={{ fontWeight: "bold" }}>Tham gia gia phả bằng mã mời</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Input
                  id="invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Nhập mã 6 chữ số"
                  maxLength={6}
                  required
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-secondary" disabled={collaborationAction !== null} aria-busy={collaborationAction === "join" || undefined}>
                  {collaborationAction === "join" ? <><span className="btn__spinner" aria-hidden="true" />Đang tham gia…</> : "Tham gia"}
                </button>
              </div>
            </form>
          )}
        </section>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Đóng
        </button>
      </ModalFooter>
    </Modal>
  );
}
