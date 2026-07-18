import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_WORKSPACE_PEOPLE_FILTERS } from "@/lib/tree-workspace/people";
import { TreePeopleSearchChrome } from "./TreePeopleSearchChrome";

describe("TreePeopleSearchChrome", () => {
  it("is controlled and contains no voice-search control", async () => {
    const onQueryChange = vi.fn();
    const onFiltersChange = vi.fn();
    const onClear = vi.fn();

    render(
      <TreePeopleSearchChrome
        query=""
        filters={DEFAULT_WORKSPACE_PEOPLE_FILTERS}
        resultCount={2}
        onQueryChange={onQueryChange}
        onFiltersChange={onFiltersChange}
        onClear={onClear}
      />,
    );

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Tìm theo tên hoặc cách xưng hô" }),
      "cha",
    );
    expect(onQueryChange).toHaveBeenLastCalledWith("a");
    expect(screen.queryByRole("button", { name: /giọng nói|microphone/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Mở bộ lọc thành viên" }));
    await userEvent.selectOptions(screen.getByLabelText("Giới tính"), "female");
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...DEFAULT_WORKSPACE_PEOPLE_FILTERS,
      gender: "female",
    });
  });

  it("shows the controlled result count and clear action", async () => {
    const onClear = vi.fn();
    render(
      <TreePeopleSearchChrome
        query="cha"
        filters={DEFAULT_WORKSPACE_PEOPLE_FILTERS}
        resultCount={1}
        onQueryChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onClear={onClear}
      />,
    );

    expect(screen.getByText("1 kết quả")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Xóa tìm kiếm và bộ lọc" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
