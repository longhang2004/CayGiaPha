import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TreeWorkspaceViewSwitcher } from "./TreeWorkspaceViewSwitcher";

describe("TreeWorkspaceViewSwitcher", () => {
  it("renders the two workspace tabs and marks current view as selected", () => {
    const onChange = vi.fn();
    render(<TreeWorkspaceViewSwitcher currentView="list" onChangeView={onChange} />);

    const listTab = screen.getByRole("tab", { name: "Danh sách" });
    const graphTab = screen.getByRole("tab", { name: "Sơ đồ" });

    expect(listTab.getAttribute("aria-selected")).toBe("true");
    expect(graphTab.getAttribute("aria-selected")).toBe("false");
    expect(screen.queryByRole("tab", { name: "Một người" })).not.toBeInTheDocument();

    fireEvent.click(graphTab);
    expect(onChange).toHaveBeenCalledWith("graph");
  });

  it("has correct attributes for roving tabIndex, target size, and aria-controls", () => {
    render(<TreeWorkspaceViewSwitcher currentView="list" onChangeView={() => {}} />);

    const listTab = screen.getByRole("tab", { name: "Danh sách" });
    const graphTab = screen.getByRole("tab", { name: "Sơ đồ" });

    expect(listTab).toHaveAttribute("tabIndex", "0");
    expect(graphTab).toHaveAttribute("tabIndex", "-1");
    expect(listTab).toHaveAttribute("aria-controls", "panel-list");
    expect(graphTab).toHaveAttribute("aria-controls", "panel-graph");
  });

  it("supports keyboard navigation with ArrowRight, ArrowLeft, Home, and End", () => {
    const onChange = vi.fn();
    const { container } = render(<TreeWorkspaceViewSwitcher currentView="list" onChangeView={onChange} />);

    const switcher = container.querySelector(".view-switcher");
    expect(switcher).toBeInTheDocument();

    fireEvent.keyDown(switcher!, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("graph");

    onChange.mockClear();
    fireEvent.keyDown(switcher!, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith("graph");

    onChange.mockClear();
    fireEvent.keyDown(switcher!, { key: "End" });
    expect(onChange).toHaveBeenCalledWith("graph");

    onChange.mockClear();
    fireEvent.keyDown(switcher!, { key: "Home" });
    expect(onChange).toHaveBeenCalledWith("list");
  });
});
