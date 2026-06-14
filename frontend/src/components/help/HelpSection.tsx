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
    <section id={topic.id} aria-labelledby={headingId} data-testid="help-section">
      <h2 id={headingId} tabIndex={-1}>
        {topic.title}
      </h2>
      {topic.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </section>
  );
}
