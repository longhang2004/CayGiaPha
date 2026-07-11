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
      <div className="help-topic__body">
        <p>{topic.purpose}</p>
        {topic.prerequisites.length > 0 && <><h3>Trước khi bắt đầu</h3><ul>{topic.prerequisites.map(item => <li key={item}>{item}</li>)}</ul></>}
        <h3>Các bước thực hiện</h3>
        <ol>{topic.steps.map(step => <li key={step}>{step}</li>)}</ol>
        <p className="help-topic__success"><strong>Khi hoàn tất:</strong> {topic.success}</p>
        <p><strong>Nếu chưa thực hiện được:</strong> {topic.recovery}</p>
        {topic.privacyNote && <p><strong>Lưu ý riêng tư:</strong> {topic.privacyNote}</p>}
      </div>
    </section>
  );
}
