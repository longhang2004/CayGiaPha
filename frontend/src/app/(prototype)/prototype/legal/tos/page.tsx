import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { TERMS_V2 } from "@/content/legal/legalContent";

export default function PrototypeTermsOfServicePage() {
  return (
    <>
      {/* ===== BEGIN: mirror of src/app/legal/tos/page.tsx ===== */}
      <LegalDocumentView document={TERMS_V2} />
      {/* ===== END: mirror of src/app/legal/tos/page.tsx ===== */}
    </>
  );
}
