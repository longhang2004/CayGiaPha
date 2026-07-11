"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/apiClient";
import { useSession } from "@/app/providers";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { GuidanceChecklist } from "@/components/guidance/GuidanceChecklist";
import { recordChecklistCompletion } from "@/lib/guidance/storage";

interface TreeItem {
  id: string;
  name: string;
  region: "Bac" | "Trung" | "Nam";
  createdAt: string;
  sharing: string;
  isOwner: boolean;
}

function TreeListContent() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const { showToast } = useToast();
  const { requestConfirm } = useConfirm();

  const [treesList, setTreesList] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New tree form fields
  const [newTreeName, setNewTreeName] = useState("");
  const [newTreeRegion, setNewTreeRegion] = useState<"Bac" | "Trung" | "Nam">("Bac");
  const [creating, setCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchTrees = async () => {
    setLoading(true);
    try {
      const data = await api.get<TreeItem[]>("/trees");
      setTreesList(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách gia phả.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading) {
      if (!user) {
        router.push("/signin?redirect=/tree");
      } else {
        fetchTrees();
      }
    }
  }, [user, sessionLoading, router]);

  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreeName.trim()) return;
    setCreating(true);
    try {
      const newTree = await api.post<TreeItem>("/trees", {
        name: newTreeName.trim(),
        region: newTreeRegion,
      });
      setNewTreeName("");
      recordChecklistCompletion("core-tree-open", window.localStorage);
      // Redirect to the newly created tree
      router.push(`/tree/${newTree.id}`);
    } catch (err: any) {
      showToast(err.message || "Tạo cây gia phả thất bại.", "error");
      setCreating(false);
    }
  };

  const handleDeleteTree = async (treeId: string, treeName: string) => {
    const confirmed = await requestConfirm({
      title: "Xóa cây gia phả",
      message: `Bạn có chắc chắn muốn xóa cây gia phả "${treeName}"? Hành động này sẽ gửi email thông báo cho tất cả cộng tác viên và xóa vĩnh viễn toàn bộ sơ đồ gia phả.`,
      destructive: true,
      confirmText: "Xóa",
    });
    if (!confirmed) return;

    try {
      await api.del(`/trees/${treeId}`);
      showToast("Đã xóa cây gia phả thành công.", "success");
      fetchTrees();
    } catch (err: any) {
      showToast(err.message || "Xóa cây gia phả thất bại.", "error");
    }
  };

  if (sessionLoading) {
    return (
      <section className="center-state" aria-live="polite">
        <div className="center-state__card">
          <span className="center-state__spinner" aria-hidden="true" />
          <p>Đang tải phiên đăng nhập…</p>
        </div>
      </section>
    );
  }


  if (loading) {
    return (
      <section className="center-state" aria-live="polite">
        <div className="center-state__card">
          <span className="center-state__spinner" aria-hidden="true" />
          <p>Đang lấy dữ liệu cây gia phả…</p>
        </div>
      </section>
    );
  }

  return (
    <main className="tree-list-page">
      <GuidanceChecklist role="owner" productState={{ treeOpened: false, personCount: 0, primitiveCount: 0, addressInspected: false, viewpointChanged: false }} />
      <div className="tree-list-page__header">
        <div>
          <p className="eyebrow tree-list-page__eyebrow">Không gian gia đình</p>
          <h1>
            Cây gia phả của bạn
          </h1>
          <p>
            Quản lý những cây gia phả bạn sở hữu hoặc đang cộng tác.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-terracotta"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Tạo cây mới
        </button>
      </div>

      {error && (
        <div className="tree-list-page__error">
          {error}
        </div>
      )}

      {/* Grid of Trees */}
      <div className="tree-list-page__grid">
        {treesList.length === 0 ? (
          <div className="surface-card tree-list-page__empty">
            <p>
              Bạn chưa sở hữu hoặc tham gia cộng tác bất kỳ cây gia phả nào.
            </p>
            <p>
              Hãy tạo cây gia phả đầu tiên của dòng họ bằng nút phía trên.
            </p>
          </div>
        ) : (
          treesList.map((tree) => (
            <div
              key={tree.id}
              className="surface-card tree-list-card"
            >
              <div className="tree-list-card__main">
                <h3>
                  {tree.name}
                </h3>
                <div className="tree-list-card__meta">
                  <span>
                    Vai trò: <strong>{tree.isOwner ? "Chủ cây" : "Cộng tác viên"}</strong>
                  </span>
                  <span>
                    Phương ngữ: <strong>{tree.region === "Bac" ? "Bắc" : tree.region === "Trung" ? "Trung" : "Nam"}</strong>
                  </span>
                </div>
              </div>
              <div className="tree-list-card__actions">
                <button
                  type="button"
                  className="btn btn-primary btn-terracotta"
                  onClick={() => { recordChecklistCompletion("core-tree-open", window.localStorage); router.push(`/tree/${tree.id}`); }}
                >
                  Xem sơ đồ
                </button>
                {tree.isOwner && (
                  <button
                    type="button"
                    className="btn btn-secondary tree-list-card__delete"
                    onClick={() => handleDeleteTree(tree.id, tree.name)}
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create New Tree Popup Modal */}
      {isCreateModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsCreateModalOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="surface-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "2rem",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
              border: "1px solid var(--color-hairline)",
              position: "relative",
            }}
          >
            <button
              type="button"
              className="side-panel__close"
              onClick={() => setIsCreateModalOpen(false)}
              aria-label="Đóng"
              title="Đóng"
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
              }}
            >
              &times;
            </button>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--color-fg)", marginBottom: "1.5rem" }}>
              Tạo cây gia phả mới
            </h2>
            <form onSubmit={handleCreateTree} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label htmlFor="tree-name" style={{ display: "block", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  Tên cây gia phả:
                </label>
                <input
                  id="tree-name"
                  type="text"
                  value={newTreeName}
                  onChange={(e) => setNewTreeName(e.target.value)}
                  placeholder="Ví dụ: Gia phả họ Nguyễn"
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid var(--color-hairline)",
                    backgroundColor: "var(--color-surface)",
                  }}
                />
              </div>

              <div>
                <label htmlFor="tree-region" style={{ display: "block", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  Cách xưng hô hiển thị theo vùng miền:
                </label>
                <select
                  id="tree-region"
                  value={newTreeRegion}
                  onChange={(e) => setNewTreeRegion(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid var(--color-hairline)",
                    backgroundColor: "var(--color-surface)",
                  }}
                >
                  <option value="Bac">Miền Bắc — Bố, Mẹ</option>
                  <option value="Trung">Miền Trung — Ba, Mạ</option>
                  <option value="Nam">Miền Nam — Tía, Má</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-terracotta"
                style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", fontWeight: 600 }}
                disabled={creating}
              >
                {creating ? "Đang tạo…" : "Tạo cây gia phả"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function TreeListPage() {
  return (
    <Suspense fallback={
      <section className="center-state" aria-live="polite">
        <div className="center-state__card">
          <span className="center-state__spinner" aria-hidden="true" />
          <p>Đang tải…</p>
        </div>
      </section>
    }>
      <TreeListContent />
    </Suspense>
  );
}
