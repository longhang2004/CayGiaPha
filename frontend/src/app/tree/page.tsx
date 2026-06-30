"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/apiClient";
import { useSession } from "@/app/providers";

interface TreeItem {
  id: string;
  name: string;
  region: "Bac" | "Trung" | "Nam";
  createdAt: string;
  sharing: string;
  isOwner: boolean;
}

export default function TreeListPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [treesList, setTreesList] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New tree form fields
  const [newTreeName, setNewTreeName] = useState("");
  const [newTreeRegion, setNewTreeRegion] = useState<"Bac" | "Trung" | "Nam">("Bac");
  const [creating, setCreating] = useState(false);

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
  }, [user, sessionLoading]);

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
      // Redirect to the newly created tree
      router.push(`/tree/${newTree.id}`);
    } catch (err: any) {
      alert(err.message || "Tạo cây gia phả thất bại.");
      setCreating(false);
    }
  };

  const handleDeleteTree = async (treeId: string, treeName: string) => {
    const confirmed = confirm(
      `Bạn có chắc chắn muốn xóa cây gia phả "${treeName}"? Hành động này sẽ gửi email thông báo cho tất cả cộng tác viên và xóa vĩnh viễn toàn bộ sơ đồ gia phả.`
    );
    if (!confirmed) return;

    try {
      await api.del(`/trees/${treeId}`);
      alert("Đã xóa cây gia phả thành công!");
      fetchTrees();
    } catch (err: any) {
      alert(err.message || "Xóa cây gia phả thất bại.");
    }
  };

  if (sessionLoading || loading) {
    return (
      <section className="center-state" aria-live="polite">
        <div className="center-state__card">
          <span className="center-state__spinner" aria-hidden="true" />
          <p>Đang tải danh sách cây gia phả…</p>
        </div>
      </section>
    );
  }

  return (
    <main style={{ maxWidth: "800px", margin: "3rem auto", padding: "0 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-brand)" }}>
            🌳 Danh Sách Cây Gia Phả
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            Lưu giữ và chia sẻ cội nguồn gia đình của bạn.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#fee2e2", color: "#ef4444", borderRadius: "8px", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* Grid of Trees */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem", marginBottom: "3rem" }}>
        {treesList.length === 0 ? (
          <div className="surface-card" style={{ padding: "3rem", textAlign: "center", border: "2px dashed var(--color-hairline)" }}>
            <p style={{ fontSize: "1.1rem", color: "var(--color-muted)", marginBottom: "1.5rem" }}>
              Bạn chưa sở hữu hoặc tham gia cộng tác bất kỳ cây gia phả nào.
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--color-muted)" }}>
              Hãy tạo cây gia phả đầu tiên của dòng họ bằng biểu mẫu phía dưới.
            </p>
          </div>
        ) : (
          treesList.map((tree) => (
            <div
              key={tree.id}
              className="surface-card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.5rem",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)",
                border: "1px solid var(--color-hairline)",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--color-fg)", margin: 0 }}>
                  {tree.name}
                </h3>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--color-muted)" }}>
                  <span>
                    Vai trò: <strong>{tree.isOwner ? "Chủ cây" : "Cộng tác viên"}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Phương ngữ: <strong>{tree.region === "Bac" ? "Bắc" : tree.region === "Trung" ? "Trung" : "Nam"}</strong>
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="btn btn-primary btn-terracotta"
                  onClick={() => router.push(`/tree/${tree.id}`)}
                >
                  Xem sơ đồ
                </button>
                {tree.isOwner && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ borderColor: "red", color: "red" }}
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

      {/* Create New Tree Card */}
      <div className="surface-card" style={{ padding: "2rem", borderRadius: "16px", border: "1px solid var(--color-hairline)" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--color-fg)", marginBottom: "1.5rem" }}>
          ➕ Tạo Cây Gia Phả Mới
        </h2>
        <form onSubmit={handleCreateTree} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label htmlFor="tree-name" style={{ display: "block", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
              Tên cây gia phả dòng họ:
            </label>
            <input
              id="tree-name"
              type="text"
              value={newTreeName}
              onChange={(e) => setNewTreeName(e.target.value)}
              placeholder="Ví dụ: Gia phả họ Nguyễn Văn"
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
              Phương ngữ chính (Xưng hô):
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
              <option value="Bac">Miền Bắc (Bố, Mẹ,...)</option>
              <option value="Trung">Miền Trung (Ba, Mạ,...)</option>
              <option value="Nam">Miền Nam (Tía, Má,...)</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-terracotta"
            style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", fontWeight: 600 }}
            disabled={creating}
          >
            {creating ? "Đang tạo…" : "Tạo Cây Gia Phả"}
          </button>
        </form>
      </div>
    </main>
  );
}
