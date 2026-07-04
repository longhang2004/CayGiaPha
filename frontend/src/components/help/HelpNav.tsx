import { HELP_TOPICS } from "@/content/help/helpTopics";

/**
 * In-page navigation for the Help_System (Requirement 17.4, 17.5).
 *
 * Lists every required topic and links to the matching section anchor, so each
 * topic is reachable from the Help_System entry point. Rendered as a labelled
 * nav landmark for assistive technologies (Requirement 18.5).
 */
export function HelpNav() {
  return (
    <nav aria-label="Mục lục hướng dẫn" data-testid="help-nav">
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {HELP_TOPICS.map((topic, index) => (
          <li key={topic.id} style={{ display: "flex", gap: "1rem", alignItems: "baseline" }}>
            <span style={{ color: "var(--color-brand)", fontWeight: 700, fontSize: "0.9rem", minWidth: "1.5rem" }}>
              {(index + 1).toString().padStart(2, '0')}.
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <a
                href={`#${topic.id}`}
                data-testid="help-nav-link"
                style={{
                  fontWeight: 600,
                  fontSize: "1.05rem",
                  color: "var(--color-fg)",
                  textDecoration: "none",
                  borderBottom: "1px solid transparent",
                  transition: "all 0.2s"
                }}
              >
                {topic.title}
              </a>
              <span style={{ fontSize: "0.95rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
                {topic.summary}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}
