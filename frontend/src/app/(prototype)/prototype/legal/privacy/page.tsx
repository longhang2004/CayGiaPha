import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { PRIVACY_V2 } from "@/content/legal/legalContent";

export default function PrototypePrivacyPolicyPage() {
  return (
    <>
      {/* ===== BEGIN: mirror of src/app/legal/privacy/page.tsx ===== */}
      <LegalDocumentView document={PRIVACY_V2} />
      {/* ===== END: mirror of src/app/legal/privacy/page.tsx ===== */}
    </>
  );
}
