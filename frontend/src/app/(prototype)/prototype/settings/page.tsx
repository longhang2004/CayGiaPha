"use client";

import { DataRightsPanel, type DataRightsAdapter } from "@/components/settings/DataRightsPanel";

const prototypeDataRightsAdapter: DataRightsAdapter = {
  loadNodes: async () => [
    {
      personId: "prototype-self",
      treeId: "prototype-tree",
      displayName: "Nguyễn Văn Minh",
      treeName: "Gia đình Nguyễn",
      claimedAt: "2026-07-13T00:00:00.000Z",
    },
  ],
  exportNode: async () => ({ prototype: true }),
  correctionHref: () => "/prototype/tree",
  eraseNode: async () => undefined,
  deleteAccount: async () => undefined,
};

export default function PrototypeSettingsPage() {
  /* ===== BEGIN: mirror of src/app/settings/page.tsx ===== */
  return (
    <main style={{ maxWidth: "800px", margin: "3rem auto", padding: "0 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-brand)" }}>
          Cài đặt hệ thống
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
          Quản lý tùy chọn hiển thị và tài khoản của bạn.
        </p>
      </div>

      <div className="surface-card" style={{ padding: "2rem", borderRadius: "12px", border: "1px solid var(--color-hairline)" }}>
        <section style={{ marginBottom: "2rem" }}>
          <h2>Chế độ hiển thị (Theme)</h2>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-secondary">Giao diện sáng</button>
            <button type="button" className="btn btn-secondary">Giao diện tối</button>
            <button type="button" className="btn btn-primary btn-terracotta">Hệ thống</button>
          </div>
        </section>
        <hr style={{ border: 0, borderTop: "1px solid var(--color-hairline)", margin: "2rem 0" }} />
        <section>
          <h2>Tài khoản của bạn</h2>
          <p>Tên hiển thị</p>
          <strong>Nguyễn Văn Minh</strong>
          <p style={{ marginTop: "1rem" }}>Số điện thoại hoặc email</p>
          <strong>minh@example.test</strong>
        </section>
      </div>

      <div className="surface-card settings-data-rights-card">
        <DataRightsPanel adapter={prototypeDataRightsAdapter} />
      </div>
    </main>
  );
  /* ===== END ===== */
}
