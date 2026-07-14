import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TreeWorkspaceViewSwitcher } from "./TreeWorkspaceViewSwitcher";

describe("TreeWorkspaceViewSwitcher", () => {
  it("renders three tabs correctly and marks current view as selected", () => {
    const onChange = vi.fn();
    render(<TreeWorkspaceViewSwitcher currentView="list" onChangeView={onChange} />);

    const focusTab = screen.getByRole("tab", { name: "Một người" });
    const listTab = screen.getByRole("tab", { name: "Danh sách" });
    const graphTab = screen.getByRole("tab", { name: "Sơ đồ" });

    expect(focusTab.getAttribute("aria-selected")).toBe("false");
    expect(listTab.getAttribute("aria-selected")).toBe("true");
    expect(graphTab.getAttribute("aria-selected")).toBe("false");

    fireEvent.click(focusTab);
    expect(onChange).toHaveBeenCalledWith("focus");

    fireEvent.click(graphTab);
    expect(onChange).toHaveBeenCalledWith("graph");
  });

  it("has correct attributes for roving tabIndex, target size, and aria-controls", () => {
    render(<TreeWorkspaceViewSwitcher currentView="focus" onChangeView={() => {}} />);

    const focusTab = screen.getByRole("tab", { name: "Một người" });
    const listTab = screen.getByRole("tab", { name: "Danh sách" });

    expect(focusTab).toHaveAttribute("tabIndex", "0");
    expect(listTab).toHaveAttribute("tabIndex", "-1");
    expect(focusTab).toHaveAttribute("aria-controls", "panel-focus");
    expect(listTab).toHaveAttribute("aria-controls", "panel-list");
  });

  it("supports keyboard navigation with ArrowRight, ArrowLeft, Home, and End", () => {
    const onChange = vi.fn();
    const { container } = render(<TreeWorkspaceViewSwitcher currentView="focus" onChangeView={onChange} />);

    const switcher = container.querySelector(".view-switcher");
    expect(switcher).toBeInTheDocument();

    fireEvent.keyDown(switcher!, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("list");

    onChange.mockClear();
    fireEvent.keyDown(switcher!, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith("graph");

    onChange.mockClear();
    fireEvent.keyDown(switcher!, { key: "End" });
    expect(onChange).toHaveBeenCalledWith("graph");

    onChange.mockClear();
    fireEvent.keyDown(switcher!, { key: "Home" });
    expect(onChange).toHaveBeenCalledWith("focus");
  });
});
