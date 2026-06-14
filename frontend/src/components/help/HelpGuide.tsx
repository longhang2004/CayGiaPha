import { HELP_TOPICS } from "@/content/help/helpTopics";
import { HelpNav } from "./HelpNav";
import { HelpSection } from "./HelpSection";

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
    <section aria-labelledby="help-guide-heading">
      <h1 id="help-guide-heading">Hướng dẫn sử dụng</h1>
      <p>
        Hướng dẫn này giải thích các khái niệm và thao tác cốt lõi của ứng dụng
        Cây Gia Phả. Chọn một mục bên dưới để chuyển tới phần tương ứng.
      </p>
      <HelpNav />
      {HELP_TOPICS.map((topic) => (
        <HelpSection key={topic.id} topic={topic} />
      ))}
    </section>
  );
}
