import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HelpGuide } from "./HelpGuide";
import { getActiveHelpTopics } from "@/content/help/helpTopics";

const EXPECTED_ACTIVE_TOPIC_IDS = [
  "tao-hoac-mo-cay",
  "them-nguoi-dau-tien",
  "them-quan-he-ro-rang",
  "xem-thong-tin-va-xung-ho",
  "doi-diem-nhin",
  "dieu-huong-so-do",
  "doc-duong-quan-he",
  "chon-vung-mien",
  "dieu-chinh-hien-thi",
  "moi-va-quan-ly-cong-tac",
  "luu-anh-ky-niem",
  "bao-mat-va-chia-se-cay",
  "gui-phan-hoi-va-ung-ho",
];

describe("HelpGuide", () => {
  const topics = getActiveHelpTopics();
  it("covers every currently accessible core and main-feature workflow", () => {
    expect(topics.map((topic) => topic.id)).toEqual(EXPECTED_ACTIVE_TOPIC_IDS);
  });

  it("lists only active canonical topics", () => {
    render(<HelpGuide />);
    const links = within(screen.getByTestId("help-nav")).getAllByTestId("help-nav-link");
    expect(links).toHaveLength(topics.length);
    for (const topic of topics) expect(within(screen.getByTestId("help-nav")).getByRole("link", { name: topic.title })).toHaveAttribute("href", `#${topic.id}`);
    expect(screen.queryByText(/xác nhận danh tính bằng mã/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ngày giỗ/i)).not.toBeInTheDocument();
  });
  it("renders task-oriented sections", () => {
    const { container } = render(<HelpGuide />);
    for (const topic of topics) {
      const heading = screen.getByRole("heading", { level: 2, name: topic.title });
      const section = heading.closest("section") as HTMLElement;
      expect(container.querySelector(`#${topic.id}`)).toHaveAttribute("data-testid", "help-section");
      expect(within(section).getByText(topic.purpose)).toBeInTheDocument();
      expect(within(section).getByText(topic.success, { exact: false })).toBeInTheDocument();
    }
  });
});
