import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CGPTabs } from "./Tabs";

const items = [
  { id: "info", label: "Chi tiết", content: <p>Thông tin chi tiết</p> },
  { id: "bio", label: "Tiểu sử", content: <p>Dòng thời gian</p> },
];

describe("CGPTabs", () => {
  it("links each tab to its tabpanel and selects the configured default", () => {
    render(
      <CGPTabs
        ariaLabel="Thông tin thành viên"
        defaultSelectedKey="info"
        items={items}
      />,
    );

    const tabList = screen.getByRole("tablist", {
      name: "Thông tin thành viên",
    });
    const infoTab = screen.getByRole("tab", { name: "Chi tiết" });
    const infoPanel = screen.getByRole("tabpanel", { name: "Chi tiết" });

    expect(tabList).toHaveClass("cgp-tabs__list");
    expect(infoTab).toHaveAttribute("aria-selected", "true");
    expect(infoTab).toHaveAttribute("aria-controls", infoPanel.id);
    expect(infoPanel).toHaveAttribute("aria-labelledby", infoTab.id);
    expect(infoPanel).toHaveTextContent("Thông tin chi tiết");
    expect(screen.queryByText("Dòng thời gian")).not.toBeInTheDocument();
  });

  it("moves selection with ArrowRight and ArrowLeft", async () => {
    const user = userEvent.setup();
    render(
      <CGPTabs
        ariaLabel="Thông tin thành viên"
        defaultSelectedKey="info"
        items={items}
      />,
    );

    const infoTab = screen.getByRole("tab", { name: "Chi tiết" });
    const bioTab = screen.getByRole("tab", { name: "Tiểu sử" });
    await user.tab();
    expect(infoTab).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(bioTab).toHaveFocus();
    expect(bioTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Tiểu sử" })).toHaveTextContent(
      "Dòng thời gian",
    );

    await user.keyboard("{ArrowLeft}");
    expect(infoTab).toHaveFocus();
    expect(infoTab).toHaveAttribute("aria-selected", "true");
  });
});
