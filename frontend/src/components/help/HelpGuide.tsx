import { HelpNav } from "./HelpNav";
import { HelpSection } from "./HelpSection";
import { HELP_TOPICS } from "@/content/help/helpTopics";
import { Card } from "@/components/ui/Card";

/**
 * The full in-application usage guide (Requirement 17).
 *
 * Renders the Help_System entry content: a table of contents (HelpNav) that
 * links to one section per required topic (17.2), followed by every topic
 * section. All content is static and synchronous, so the guide renders well
 * within the 2-second budget (17.3); every topic is reachable from the entry
 * point (17.4, 17.5).
 */
export function HelpGuide() {
  return (
    <main style={{ maxWidth: "800px", margin: "3rem auto", padding: "0 1.5rem" }} aria-labelledby="help-guide-heading">
      <div style={{ marginBottom: "3rem" }}>
        <h1 id="help-guide-heading" style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--color-brand)", marginBottom: "0.5rem" }}>
          Hướng dẫn sử dụng
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: "1.05rem", lineHeight: 1.6 }}>
          Hướng dẫn này giải thích các khái niệm và thao tác cốt lõi của ứng dụng
          Cây Gia Phả. Chọn một mục bên dưới để chuyển tới phần tương ứng.
        </p>
      </div>

      <Card style={{ marginBottom: "3.5rem", padding: "1.5rem 2rem", backgroundColor: "var(--color-surface-hover)", border: "1px solid var(--color-hairline)" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: 0, marginBottom: "1.25rem", borderBottom: "1px solid var(--color-hairline-strong)", paddingBottom: "0.75rem", color: "var(--color-fg)" }}>
          Mục lục tra cứu
        </h2>
        <HelpNav />
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: "4rem" }}>
        {HELP_TOPICS.map((topic) => (
          <HelpSection key={topic.id} topic={topic} />
        ))}
      </div>
    </main>
  );
}
