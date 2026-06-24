"use client";

/**
 * Prototype: Tree workspace — empty/onboarding state
 *
 * Mirrors: src/app/tree/page.tsx (persons.length === 0 branch)
 *
 * Renders the first-member form (empty tree onboarding) with mock session.
 * PersonForm submit is functional in structure but will fail API calls —
 * a note is shown to prototype users.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When the empty tree / onboarding section of src/app/tree/page.tsx
 * changes, update this file in the SAME commit/PR.
 */

import { PersonForm } from "@/components/person/PersonForm";
import { MockSessionProvider } from "@/lib/prototype/mockSession";
import { PROTOTYPE_TREE_ID } from "@/lib/prototype/mockData";

function PrototypeEmptyTreeContent() {
  return (
    /* ===== BEGIN: mirror of src/app/tree/page.tsx (empty tree branch) ===== */
    <section className="empty-tree">
      <div className="empty-tree__intro">
        <p className="eyebrow">Dành cho người mới</p>
        <h1>Bắt đầu cây gia phả của bạn</h1>
        <p>
          Sơ đồ gia phả của bạn hiện chưa có thành viên nào. Hãy thêm thành
          viên đầu tiên (ví dụ: bản thân bạn hoặc người lớn tuổi nhất trong
          dòng họ) để bắt đầu.
        </p>
      </div>
      <div className="onboarding-strip" aria-label="Các bước gợi ý">
        <span>1. Nhập tên</span>
        <span>2. Chọn giới tính</span>
        <span>3. Bấm lưu</span>
      </div>
      <div className="surface-card empty-tree__form">
        <PersonForm
          mode="create"
          treeId={PROTOTYPE_TREE_ID}
          onSuccess={() => {
            /* no-op in prototype */
          }}
        />
      </div>
    </section>
    /* ===== END ===== */
  );
}

export default function PrototypeTreeEmptyPage() {
  return (
    <MockSessionProvider>
      <PrototypeEmptyTreeContent />
    </MockSessionProvider>
  );
}
