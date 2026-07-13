import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { TERMS_V2 } from "@/content/legal/legalContent";

export default function TermsOfServicePage() {
  return <LegalDocumentView document={TERMS_V2} />;
}
