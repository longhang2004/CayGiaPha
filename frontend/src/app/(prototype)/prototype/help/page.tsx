import type { Metadata } from "next";
import { HelpGuide } from "@/components/help/HelpGuide";

export const metadata: Metadata = {
  title: "Hướng dẫn sử dụng (Prototype) — Cây Gia Phả",
};

/**
 * Prototype: Help page
 *
 * Mirrors: src/app/help/page.tsx
 *
 * HelpGuide is purely static — this is a direct mirror with no mock data
 * needed. It exists here so agents can navigate to it without any auth.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When src/app/help/page.tsx or HelpGuide UI/UX changes,
 * update this file in the SAME commit/PR.
 */
export default function PrototypeHelpPage() {
  /* ===== BEGIN: mirror of src/app/help/page.tsx ===== */
  return <HelpGuide />;
  /* ===== END ===== */
}
