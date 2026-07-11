import { getActiveHelpTopics } from "@/content/help/helpTopics";

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
      <ul className="help-nav__list">
        {getActiveHelpTopics().map((topic, index) => (
          <li key={topic.id} className="help-nav__item">
            <span className="help-nav__num">
              {(index + 1).toString().padStart(2, '0')}.
            </span>
            <div className="help-nav__link-group">
              <a
                href={`#${topic.id}`}
                data-testid="help-nav-link"
                className="help-nav__link"
              >
                {topic.title}
              </a>
              <span className="help-nav__summary">
                {topic.summary}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}
