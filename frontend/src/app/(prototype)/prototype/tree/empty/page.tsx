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
import { Card } from "@/components/ui/Card";
import { GuidanceChecklist } from "@/components/guidance/GuidanceChecklist";

function PrototypeEmptyTreeContent() {
  return (
    /* ===== BEGIN: mirror of src/app/tree/page.tsx (empty tree branch) ===== */
    <section className="empty-tree" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
      <div className="empty-tree__intro" style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Bắt đầu cây gia phả của bạn</h1>
        <p style={{ color: "var(--color-muted)", lineHeight: 1.6 }}>
          Sơ đồ gia phả của bạn hiện chưa có thành viên nào. Hãy thêm thành viên đầu tiên
          để bắt đầu.
        </p>
      </div>
      <div style={{ marginBottom: "2rem", textAlign: "left" }}>
        <GuidanceChecklist
          role="owner"
          productState={{
            treeOpened: true,
            personCount: 0,
            primitiveCount: 0,
            addressInspected: false,
            viewpointChanged: false
          }}
        />
      </div>
      <Card className="empty-tree__form" style={{ padding: "2rem", textAlign: "left" }}>
        <PersonForm
          mode="create"
          treeId={PROTOTYPE_TREE_ID}
          onSuccess={() => {
            /* no-op in prototype */
          }}
        />
      </Card>
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
