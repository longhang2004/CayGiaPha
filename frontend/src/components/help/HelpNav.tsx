import type { HelpTopic } from "@/content/help/helpTopics";

interface HelpNavProps {
  topics: HelpTopic[];
  selectedTopicId: string | null;
  onSelectTopic: (id: string) => void;
}

export function HelpNav({ topics, selectedTopicId, onSelectTopic }: HelpNavProps) {
  if (topics.length === 0) {
    return <p className="help-nav__empty">Không tìm thấy hướng dẫn phù hợp.</p>;
  }

  return (
    <nav aria-label="Mục lục hướng dẫn" data-testid="help-nav">
      <ul className="help-nav__list">
        {topics.map((topic, index) => (
          <li key={topic.id} className={`help-nav__item ${selectedTopicId === topic.id ? "help-nav__item--active" : ""}`}>
            <span className="help-nav__num">
              {(index + 1).toString().padStart(2, '0')}.
            </span>
            <div className="help-nav__link-group">
              <button
                type="button"
                onClick={() => onSelectTopic(topic.id)}
                data-testid="help-nav-link"
                className="help-nav__link btn-ghost"
                style={{ textAlign: "left", padding: 0, height: "auto", whiteSpace: "normal", fontWeight: selectedTopicId === topic.id ? 600 : 400 }}
              >
                {topic.title}
              </button>
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
