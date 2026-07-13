import Link from "next/link";
import type { CanonicalLegalDocument } from "@/content/legal/legalContent";

export function LegalDocumentView({ document }: { document: CanonicalLegalDocument }) {
  return (
    <div className="legal-page">
      <Link href="/" className="legal-page__brand">
        <img src="/logo.svg" alt="Logo Cây Gia Phả" />
        <span>Cây Gia Phả</span>
      </Link>
      <main className="surface-card legal-page__document">
        <h1>{document.title}</h1>
        <p className="legal-page__meta">
          Phiên bản {document.version} · {document.publishedLabel}
        </p>
        <p className="legal-page__notice">{document.reviewNotice}</p>
        {document.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets ? (
              <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : null}
          </section>
        ))}
        <div className="legal-page__actions">
          <Link href="/signup" className="btn btn-secondary">← Quay lại đăng ký</Link>
          <Link href="/feedback" className="btn btn-secondary">Gửi phản hồi</Link>
        </div>
      </main>
    </div>
  );
}
