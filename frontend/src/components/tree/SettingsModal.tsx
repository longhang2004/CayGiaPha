import { useState, useEffect } from "react";
import { useSession } from "@/app/providers";
import { CGPDialog } from "@/components/cgp";
import { useToast } from "@/components/ui/ToastProvider";
import { Input } from "@/components/ui/FormControls";
import { RegionSelector } from "@/components/region/RegionSelector";
import { TextSizeControl } from "@/components/a11y/TextSizeControl";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { api, ApiError } from "@/lib/apiClient";
import type { Region } from "@/lib/region";
import { GUIDANCE_REOPEN_EVENT, GUIDANCE_RESET_EVENT, resetGuidanceState } from "@/lib/guidance/storage";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  treeId: string;
  isOwner: boolean;

  // Current settings
  treeName: string;
  region: Region;
  livingRedaction: boolean;
  sharing: string;
  shareToken: string | null;
  showBirthYears: boolean;

  // Callbacks
  onTreeNameChange: (name: string) => void;
  onRegionChange: (region: Region) => void;
  onLivingRedactionChange: (enabled: boolean) => void;
  onSharingChange: (sharing: string, token: string | null) => void;
  onShowBirthYearsChange: (show: boolean) => void;
  onShowTutorial?: () => void;

  isPrototype?: boolean;
}

export function SettingsModal({
  isOpen,
  onClose,
  treeId,
  isOwner,
  treeName,
  region,
  livingRedaction,
  sharing,
  shareToken,
  showBirthYears,
  onTreeNameChange,
  onRegionChange,
  onLivingRedactionChange,
  onSharingChange,
  onShowBirthYearsChange,
  onShowTutorial,
  isPrototype = false
}: SettingsModalProps) {
  const { user, loading: sessionLoading } = useSession();
  const { showToast } = useToast();

  const [treeNameInput, setTreeNameInput] = useState(treeName);
  const [updatingTreeName, setUpdatingTreeName] = useState(false);
  const [updatingRedaction, setUpdatingRedaction] = useState(false);
  const [updatingSharing, setUpdatingSharing] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  // Sync input if external treeName changes
  useEffect(() => {
    setTreeNameInput(treeName);
  }, [treeName]);

  async function handleTreeNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!treeId || !treeNameInput.trim()) return;

    setUpdatingTreeName(true);
    try {
      if (isPrototype) {
        await new Promise(resolve => setTimeout(resolve, 300));
        onTreeNameChange(treeNameInput.trim());
        showToast("Đã cập nhật tên cây gia phả.", "success");
        return;
      }

      const result = await api.patch<{ treeId: string; name: string }>(
        `/trees/${encodeURIComponent(treeId)}/name`,
        { name: treeNameInput.trim() },
      );
      onTreeNameChange(result.name);
      setTreeNameInput(result.name);
      showToast("Đã cập nhật tên cây gia phả.", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Không thể đổi tên cây.", "error");
    } finally {
      setUpdatingTreeName(false);
    }
  }

  async function handleRedactionChange(enabled: boolean) {
    if (!treeId) return;
    setUpdatingRedaction(true);
    try {
      if (isPrototype) {
        await new Promise(resolve => setTimeout(resolve, 300));
        onLivingRedactionChange(enabled);
        return;
      }

      const result = await api.patch<{ enabled: boolean }>(`/trees/${treeId}/living-redaction`, { enabled });
      onLivingRedactionChange(result.enabled);
    } catch (err) {
      console.warn(err instanceof ApiError ? err.message : "Không thể cập nhật cấu hình bảo vệ.");
    } finally {
      setUpdatingRedaction(false);
    }
  }

  async function handleSharingChange(nextSharing: string) {
    if (!treeId) return;
    setUpdatingSharing(true);
    try {
      if (isPrototype) {
        await new Promise(resolve => setTimeout(resolve, 300));
        onSharingChange(nextSharing, nextSharing !== "link" ? null : shareToken);
        return;
      }

      const result = await api.patch<{ sharing: string }>(`/trees/${treeId}/sharing`, { sharing: nextSharing });
      onSharingChange(result.sharing, result.sharing !== "link" ? null : shareToken);
    } catch (err) {
      console.warn(err instanceof ApiError ? err.message : "Không thể thay đổi cấu hình chia sẻ.");
    } finally {
      setUpdatingSharing(false);
    }
  }

  async function handleGetShareLink() {
    if (!treeId) return;
    setGeneratingToken(true);
    try {
      if (isPrototype) {
        await new Promise(resolve => setTimeout(resolve, 300));
        onSharingChange(sharing, "mock-share-token-12345");
        return;
      }

      const result = await api.post<{ token: string }>(`/trees/${treeId}/share-token`);
      onSharingChange(sharing, result.token);
    } catch (err) {
      console.warn(err instanceof ApiError ? err.message : "Không thể tạo liên kết chia sẻ.");
    } finally {
      setGeneratingToken(false);
    }
  }

  async function handleRevokeShareLink() {
    if (!treeId) return;
    setGeneratingToken(true);
    try {
      if (isPrototype) {
        await new Promise(resolve => setTimeout(resolve, 300));
        onSharingChange(sharing, null);
        showToast("Đã hủy bỏ tất cả liên kết chia sẻ trước đó.", "success");
        return;
      }

      await api.del(`/trees/${treeId}/share-token`);
      onSharingChange(sharing, null);
      showToast("Đã hủy bỏ tất cả liên kết chia sẻ trước đó.", "success");
    } catch (err) {
      console.warn(err instanceof ApiError ? err.message : "Không thể hủy bỏ liên kết chia sẻ.");
    } finally {
      setGeneratingToken(false);
    }
  }

  return (
    <CGPDialog
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!nextIsOpen) onClose();
      }}
      title="Cài đặt"
      size="lg"
      className="settings-modal-cgp"
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Đóng
        </button>
      }
    >
        {isOwner && (
          <section className="settings-section">
            <h3>Cài đặt gia phả</h3>
            <form onSubmit={handleTreeNameSubmit} className="field" style={{ marginBottom: "1rem" }}>
              <label htmlFor="tree-name-input">Tên cây gia phả</label>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <Input
                  id="tree-name-input"
                  value={treeNameInput}
                  onChange={(e) => setTreeNameInput(e.target.value)}
                  maxLength={120}
                  required
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn" disabled={updatingTreeName || !treeNameInput.trim()}>
                  {updatingTreeName ? "Đang lưu…" : "Lưu"}
                </button>
              </div>
            </form>
            <RegionSelector
              treeId={treeId}
              region={region}
              onChange={onRegionChange}
              isPrototype={isPrototype}
            />

            <div className="field" style={{ marginTop: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={livingRedaction}
                  disabled={updatingRedaction}
                  onChange={(e) => handleRedactionChange(e.target.checked)}
                />
                <span>Ẩn thông tin người còn sống</span>
              </label>
            </div>

            <div className="field" style={{ marginTop: "1rem" }}>
              <label htmlFor="sharing-select">Chế độ chia sẻ</label>
              <select
                id="sharing-select"
                value={sharing}
                disabled={updatingSharing}
                onChange={(e) => handleSharingChange(e.target.value)}
                style={{ width: "100%", marginTop: "0.5rem" }}
              >
                <option value="private">Riêng tư (Private)</option>
                <option value="link">Bằng liên kết bí mật (Link)</option>
                <option value="public">Công khai cho thành viên (Public)</option>
              </select>
            </div>

            {sharing === "link" && (
              <div style={{ borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1rem", marginTop: "1rem" }}>
                {shareToken ? (
                  <div>
                    <label>Liên kết chia sẻ của bạn:</label>
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/tree/${treeId}#shareToken=${encodeURIComponent(shareToken)}` : ""}
                      style={{ width: "100%", fontSize: "0.75rem", margin: "0.5rem 0" }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => {
                          const url = `${window.location.origin}/tree/${treeId}#shareToken=${encodeURIComponent(shareToken)}`;
                          navigator.clipboard.writeText(url);
                          showToast("Đã sao chép liên kết vào bộ nhớ tạm!", "success");
                        }}
                      >
                        Sao chép
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        disabled={generatingToken}
                        onClick={handleRevokeShareLink}
                      >
                        Hủy liên kết
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: "100%" }}
                    disabled={generatingToken}
                    onClick={handleGetShareLink}
                  >
                    Tạo liên kết chia sẻ
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        <section className="settings-section" style={{ borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
          <h3>Cài đặt hiển thị</h3>
          <TextSizeControl />

          <div className="field" style={{ marginTop: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.95rem" }}>
              <input
                type="checkbox"
                checked={showBirthYears}
                onChange={(e) => onShowBirthYearsChange(e.target.checked)}
              />
              <span>Hiển thị năm sinh/năm mất trực tiếp trên các node cây</span>
            </label>
          </div>

          <div style={{ marginTop: "1rem", display: "grid", gap: ".75rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  if (onShowTutorial) onShowTutorial();
                  else window.dispatchEvent(new Event(GUIDANCE_REOPEN_EVENT));
                  onClose();
                }}
              >
                Xem lại hướng dẫn sử dụng
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  resetGuidanceState(window.localStorage);
                  window.dispatchEvent(new Event(GUIDANCE_RESET_EVENT));
                  showToast("Đã đặt lại hướng dẫn trên thiết bị này.", "success");
                  onClose();
                }}
              >
                Đặt lại hướng dẫn
              </button>
          </div>
        </section>

        <section className="settings-section" style={{ borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
          <h3>Thông tin tài khoản</h3>
          {!sessionLoading && user && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(() => {
                const hasDisplayName = Boolean(user.displayName?.trim());
                const primaryLabel =
                  user.displayName?.trim() || user.identifier || "Người dùng";
                return (
                  <div className="settings-modal__user account-identity">
                    <div className="account-identity__primary" title={primaryLabel}>
                      <strong>{primaryLabel}</strong>
                    </div>
                    {hasDisplayName ? (
                      <div className="account-identity__secondary" title={user.identifier}>
                        {user.identifier}
                      </div>
                    ) : null}
                  </div>
                );
              })()}
              {isPrototype ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    showToast("Đã đăng xuất (Mock).", "success");
                    onClose();
                  }}
                >
                  Đăng xuất
                </button>
              ) : (
                <SignOutButton redirectTo="/" />
              )}
            </div>
          )}
        </section>
    </CGPDialog>
  );
}
