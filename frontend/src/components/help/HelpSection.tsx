import type { HelpTopic } from "@/content/help/helpTopics";

/**
 * Renders a single Help_System topic section (Requirement 17.2, 17.4).
 *
 * The section carries the topic `id` as its anchor target so it is reachable
 * directly from the Help_System nav, and is labelled by its heading for
 * assistive technologies (Requirement 18.5).
 */
interface HelpSectionProps {
  topic: HelpTopic;
}

export function HelpSection({ topic }: HelpSectionProps) {
  const headingId = `${topic.id}-heading`;
  return (
    <section id={topic.id} aria-labelledby={headingId} data-testid="help-section" style={{ scrollMarginTop: "6rem" }}>
      <h2 id={headingId} tabIndex={-1} style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-fg)", marginBottom: "1.5rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--color-hairline)" }}>
        {topic.title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", color: "var(--color-muted)", fontSize: "1.05rem", lineHeight: 1.7 }}>
        {topic.paragraphs.map((paragraph, index) => (
          <p key={index} style={{ margin: 0 }}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
