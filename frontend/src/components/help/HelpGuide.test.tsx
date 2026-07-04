import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HelpGuide } from "./HelpGuide";
import { HELP_TOPICS } from "@/content/help/helpTopics";

/**
 * Help_System content + navigation tests (Requirement 17.2, 17.4, 17.5).
 *
 * The six required topics from 17.2 must each have a section, and each section
 * must be reachable from the entry-point nav. We assert the nav lists all six
 * topics and that every nav link targets a section anchor that is actually
 * rendered.
 */

const REQUIRED_TOPIC_IDS = [
  "duong-net-lien-va-net-dut", // solid vs dashed lines
  "them-nguoi-than", // adding derived and asserted relatives
  "cach-tinh-xung-ho", // how address is computed
  "doi-diem-nhin", // changing the viewpoint
  "xac-nhan-nut", // claiming a node
  "chon-vung-mien-va-bao-mat", // selecting a region and privacy
  "tim-duong-di", // pathfinding
  "cong-tac-vien", // collaboration
  "ca-nhan-hoa-giao-dien", // ui customization
];

describe("HelpGuide", () => {
  it("covers all required topics from criterion 17.2 and additional system topics", () => {
    // Guard against the content drifting away from the required topic set.
    expect(HELP_TOPICS.map((t) => t.id).sort()).toEqual(
      [...REQUIRED_TOPIC_IDS].sort(),
    );
  });

  it("lists every required topic in the entry-point navigation (17.4, 17.5)", () => {
    render(<HelpGuide />);
    const nav = screen.getByTestId("help-nav");
    const links = within(nav).getAllByTestId("help-nav-link");
    expect(links).toHaveLength(HELP_TOPICS.length);

    for (const topic of HELP_TOPICS) {
      const link = within(nav).getByRole("link", { name: topic.title });
      expect(link).toHaveAttribute("href", `#${topic.id}`);
    }
  });

  it("renders a reachable section for each topic the nav links to (17.5)", () => {
    const { container } = render(<HelpGuide />);

    for (const topic of HELP_TOPICS) {
      // Heading is present...
      expect(
        screen.getByRole("heading", { level: 2, name: topic.title }),
      ).toBeInTheDocument();
      // ...and the nav-link target anchor actually exists in the document.
      const target = container.querySelector(`#${topic.id}`);
      expect(target).not.toBeNull();
      expect(target).toHaveAttribute("data-testid", "help-section");
    }
  });

  it("renders the topic body content for each section", () => {
    render(<HelpGuide />);
    for (const topic of HELP_TOPICS) {
      const heading = screen.getByRole("heading", { level: 2, name: topic.title });
      const section = heading.closest("section");
      expect(section).not.toBeNull();
      // First paragraph of each topic is rendered within its section.
      expect(within(section as HTMLElement).getByText(topic.paragraphs[0])).toBeInTheDocument();
    }
  });
});
