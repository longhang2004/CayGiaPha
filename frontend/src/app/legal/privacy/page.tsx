import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { PRIVACY_V2 } from "@/content/legal/legalContent";

export default function PrivacyPolicyPage() {
  return <LegalDocumentView document={PRIVACY_V2} />;
}
