import { describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpGuide } from "./HelpGuide";
import { getActiveHelpTopics } from "@/content/help/helpTopics";

const EXPECTED_ACTIVE_TOPIC_IDS = [
  "tao-hoac-mo-cay",
  "thao-tac-trong-cay",
  "them-nguoi-dau-tien",
  "them-nguoi-moi",
  "sua-va-them-thanh-vien",
  "them-quan-he-ro-rang",
  "ghi-cach-goi-net-dut",
  "xem-thong-tin-va-xung-ho",
  "doi-diem-nhin",
  "dieu-huong-so-do",
  "xem-va-luu-so-do",
  "doc-duong-quan-he",
  "chon-vung-mien",
  "dieu-chinh-hien-thi",
  "moi-va-quan-ly-cong-tac",
  "luu-anh-ky-niem",
  "bao-mat-va-chia-se-cay",
  "gui-phan-hoi-va-ung-ho",
  "xac-nhan-day-la-toi",
];

describe("HelpGuide", () => {
  const topics = getActiveHelpTopics();
  it("covers every currently accessible core and main-feature workflow", () => {
    expect(topics.map((topic) => topic.id)).toEqual(EXPECTED_ACTIVE_TOPIC_IDS);
  });

  it("lists active canonical topics in the nav", () => {
    render(<HelpGuide />);
    const links = within(screen.getByTestId("help-nav")).getAllByTestId("help-nav-link");
    expect(links).toHaveLength(topics.length);
    for (const topic of topics) {
      expect(within(screen.getByTestId("help-nav")).getByRole("button", { name: topic.title })).toBeInTheDocument();
    }
  });

  it("renders one task-oriented section at a time when selected", async () => {
    const user = userEvent.setup();
    const { container } = render(<HelpGuide />);

    // Initially no section is rendered
    expect(screen.getByText(/Chọn một mục lục để xem chi tiết/i)).toBeInTheDocument();

    const topic = topics[0];
    await user.click(screen.getByRole("button", { name: topic.title }));

    const heading = screen.getByRole("heading", { level: 2, name: topic.title });
    const section = heading.closest("section") as HTMLElement;
    expect(container.querySelector(`#${topic.id}`)).toHaveAttribute("data-testid", "help-section");
    expect(within(section).getByText(topic.purpose)).toBeInTheDocument();
    expect(within(section).getByText(topic.success, { exact: false })).toBeInTheDocument();

    // Check that privacy note shows up if selected
    const privacyTopic = topics.find(t => t.id === "bao-mat-va-chia-se-cay")!;
    await user.click(screen.getByRole("button", { name: privacyTopic.title }));
    expect(screen.getAllByText(/ẩn thông tin người còn sống/i)[0]).toBeInTheDocument();
  });

  it("restores focus to the selected section heading after render", async () => {
    const user = userEvent.setup();
    render(<HelpGuide />);

    const topic = topics[0];
    await user.click(screen.getByRole("button", { name: topic.title }));

    // Wait for the deferred focus effect
    await vi.waitFor(() => {
      const heading = screen.getByRole("heading", { level: 2, name: topic.title });
      expect(document.activeElement).toBe(heading);
    });
  });

  it("proves that hash change selects the topic, focus goes to the heading, and popstate handles back state coherently", async () => {
    window.location.hash = "";
    render(<HelpGuide />);

    expect(screen.getByText(/Chọn một mục lục để xem chi tiết/i)).toBeInTheDocument();

    const topic = topics[1];
    await act(async () => {
      window.location.hash = `#${topic.id}`;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: topic.title })).toBeInTheDocument();
    });

    await vi.waitFor(() => {
      const heading = screen.getByRole("heading", { level: 2, name: topic.title });
      expect(document.activeElement).toBe(heading);
    });

    await act(async () => {
      window.location.hash = "";
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await vi.waitFor(() => {
      expect(screen.getByText(/Chọn một mục lục để xem chi tiết/i)).toBeInTheDocument();
    });
  });
});
