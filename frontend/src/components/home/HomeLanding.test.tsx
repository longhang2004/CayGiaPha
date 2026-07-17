import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HomeLanding } from "./HomeLanding";

describe("HomeLanding", () => {
  it.each([
    ["loading", "Đang kiểm tra phiên đăng nhập…", undefined],
    ["signed-out", "Tạo cây gia phả", "/signup"],
    ["signed-in", "Mở cây gia phả", "/tree"],
  ] as const)("renders the %s primary action", (state, label, href) => {
    render(<HomeLanding state={state} animated={false} />);

    const action = href
      ? screen.getAllByRole("link", { name: label })[0]
      : screen.getAllByText(label)[0];
    if (href) expect(action).toHaveAttribute("href", href);
    else {
      expect(action).toHaveAttribute("aria-busy", "true");
      expect(action).toHaveClass("home-landing__secondary-action");
    }
  });

  it("renders the approved long-form section landmarks", () => {
    render(<HomeLanding state="signed-out" animated={false} />);

    for (const name of [
      "Một nơi để gia đình cùng nhớ",
      "Bắt đầu từ những điều bạn đang biết",
      "Những việc một cây gia phả có thể giữ lại",
      "Cách gọi đúng với từng gia đình Việt",
      "Riêng tư bắt đầu từ quyền kiểm soát",
      "Mỗi người góp một phần khác nhau",
      "Câu hỏi thường gặp",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }

    expect(screen.getByRole("region", { name: "Cách hoạt động" })).toHaveAttribute(
      "id",
      "cach-hoat-dong",
    );
    expect(screen.getByRole("region", { name: "Tính năng" })).toHaveAttribute(
      "id",
      "tinh-nang",
    );
    expect(screen.getByRole("region", { name: "Riêng tư" })).toHaveAttribute(
      "id",
      "rieng-tu",
    );
  });

  it("marks the learn action for a high-contrast hero treatment", () => {
    render(<HomeLanding state="signed-out" animated={false} />);

    expect(screen.getByRole("link", { name: "Xem cách hoạt động" })).toHaveClass(
      "home-landing__learn-action",
    );
  });

  it("renders an unambiguous three-generation lineage visual", () => {
    const { container } = render(<HomeLanding state="signed-out" animated={false} />);

    expect(container.querySelector(".home-story-lineage__connector")).toBeInTheDocument();
    expect(screen.getByText("Bạn", { selector: ".home-story-node" })).toBeInTheDocument();
  });

  it("offers six practical FAQ answers", () => {
    render(<HomeLanding state="signed-out" animated={false} />);

    const faq = screen.getByRole("region", { name: "Câu hỏi thường gặp" });
    const questions = within(faq).getAllByRole("button");
    expect(questions).toHaveLength(6);
    expect(within(faq).getByText("Dùng Cây Gia Phả có mất phí không?")).toBeInTheDocument();
    expect(within(faq).getByText("Tôi có thể xuất hoặc xóa dữ liệu không?")).toBeInTheDocument();
  });

  it("opens and closes FAQ answers with an accessible control", async () => {
    const user = userEvent.setup();
    render(<HomeLanding state="signed-out" animated={false} />);

    const faq = screen.getByRole("region", { name: "Câu hỏi thường gặp" });
    const question = within(faq).getByRole("button", {
      name: "Dùng Cây Gia Phả có mất phí không?",
    });

    expect(question).toHaveAttribute("aria-expanded", "false");
    await user.click(question);
    expect(question).toHaveAttribute("aria-expanded", "true");
    await user.click(question);
    expect(question).toHaveAttribute("aria-expanded", "false");
  });

  it("links Help, support, feedback, Terms, and Privacy from the footer", () => {
    render(<HomeLanding state="signed-out" animated={false} />);

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "Hướng dẫn" })).toHaveAttribute(
      "href",
      "/help",
    );
    expect(within(footer).getByRole("link", { name: "Feedback" })).toHaveAttribute(
      "href",
      "/feedback",
    );
    expect(within(footer).getByRole("link", { name: "Ủng hộ" })).toHaveAttribute(
      "href",
      "/support",
    );
    expect(within(footer).getByRole("link", { name: "Điều khoản dịch vụ" })).toHaveAttribute(
      "href",
      "/legal/tos",
    );
    expect(
      within(footer).getByRole("link", { name: "Chính sách quyền riêng tư" }),
    ).toHaveAttribute("href", "/legal/privacy");
  });

  it("does not advertise unshipped pricing or social proof", () => {
    render(<HomeLanding state="signed-out" animated={false} />);

    expect(screen.queryByText(/gói trả phí|bảng giá|khách hàng tin dùng|testimonial/i)).not.toBeInTheDocument();
  });
});
