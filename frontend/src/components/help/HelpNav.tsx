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
      <ul>
        {HELP_TOPICS.map((topic) => (
          <li key={topic.id}>
            <a href={`#${topic.id}`} data-testid="help-nav-link">
              {topic.title}
            </a>
            <span> — {topic.summary}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
