"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/apiClient";
import { useSession } from "@/app/providers";
import { useCGPToast } from "@/components/cgp";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { GuidanceChecklist } from "@/components/guidance/GuidanceChecklist";
import { EarlyAccessWelcomeDialog } from "@/components/tree/EarlyAccessWelcomeDialog";
import { TreeEntryModal, type CreateTreeInput, type TreeEntryResult } from "@/components/tree/TreeEntryModal";
import { joinTreeGroup } from "@/lib/collaboration";

interface TreeItem {
  id: string;
  name: string;
  region: "Bac" | "Trung" | "Nam";
  createdAt: string;
  sharing: string;
  isOwner: boolean;
  accessRole: "OWNER" | "CONTRIBUTOR" | "LINKED";
}

const ACCESS_ROLE_LABEL: Record<TreeItem["accessRole"], string> = {
  OWNER: "Chủ cây",
  CONTRIBUTOR: "Cộng tác viên",
  LINKED: "Thành viên đã xác nhận",
};

function TreeListContent() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const { show } = useCGPToast();
  const { requestConfirm } = useConfirm();

  const [treesList, setTreesList] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleCreateTree = async (input: CreateTreeInput): Promise<TreeEntryResult> => {
    const newTree = await api.post<TreeItem>("/trees", input);
    return { kind: "ready", treeId: newTree.id };
  };

  const handleJoinTree = async (code: string): Promise<TreeEntryResult> => {
    const result = await joinTreeGroup(code);
    if ("status" in result && result.status === "pending") return { kind: "pending" };
    return { kind: "ready", treeId: result.treeId };
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
      show("Đã xóa cây gia phả thành công.", { tone: "success" });
      fetchTrees();
    } catch (err: any) {
      show(err.message || "Xóa cây gia phả thất bại.", { tone: "error" });
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
      <EarlyAccessWelcomeDialog />
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
          + Thêm cây
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
            <h2 style={{ marginTop: 0 }}>Chào mừng bạn đến với Cây Gia Phả</h2>
            <p>
              Bạn chưa sở hữu hoặc tham gia cộng tác bất kỳ cây gia phả nào.
            </p>
            <p>
              Chọn Thêm cây để tạo cây mới hoặc tham gia cây của người thân bằng mã mời.
            </p>
            <div style={{ marginTop: "1.5rem" }}>
              <GuidanceChecklist role="owner" productState={{ treeOpened: false, personCount: 0, primitiveCount: 0, addressInspected: false, viewpointChanged: false }} />
            </div>
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
                    Vai trò: <strong>{ACCESS_ROLE_LABEL[tree.accessRole]}</strong>
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
                  onClick={() => router.push(`/tree/${tree.id}`)}
                >
                  Xem sơ đồ
                </button>
                {tree.accessRole === "OWNER" && (
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

      <TreeEntryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTree}
        onJoin={handleJoinTree}
        onTreeReady={(treeId) => router.push(`/tree/${treeId}`)}
      />
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
