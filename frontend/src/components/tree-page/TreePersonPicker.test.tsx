import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TreePersonPicker } from "./TreePersonPicker";

const PERSONS = [
  { id: "one", displayName: "Hàng Nhựt Long", gender: "male" as const },
  { id: "two", displayName: "Nguyễn Thị Minh", gender: "female" as const },
  { id: "three", displayName: "Hàng Nhựt Tiến", gender: "male" as const },
];

describe("TreePersonPicker", () => {
  it("shows every person, filters without Vietnamese diacritics, and selects a viewpoint", async () => {
    const user = userEvent.setup();
    const onSelectPerson = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <TreePersonPicker
        mode="viewpoint"
        persons={PERSONS}
        addresses={new Map()}
        egoId="one"
        selectedId="one"
        isOpen
        onOpenChange={onOpenChange}
        onSelectPerson={onSelectPerson}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Tìm thấy 3 người");
    expect(screen.getByRole("dialog", { name: "Chọn người để xét vai vế" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Xét theo / })).toHaveLength(3);

    await user.type(screen.getByRole("searchbox", { name: "Tìm người để xét" }), "nhut tien");
    expect(screen.getByRole("status")).toHaveTextContent("Tìm thấy 1 người");
    await user.click(screen.getByRole("button", { name: "Xét theo Hàng Nhựt Tiến" }));

    expect(onSelectPerson).toHaveBeenCalledWith("three");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("uses fixed chrome and a list-only scroll region", () => {
    const { baseElement } = render(
      <TreePersonPicker
        mode="viewpoint"
        persons={PERSONS}
        addresses={new Map()}
        egoId="one"
        selectedId="one"
        isOpen
        onOpenChange={vi.fn()}
        onSelectPerson={vi.fn()}
      />,
    );

    const scrollRegions = baseElement.querySelectorAll('[data-panel-scroll-region="picker"]');
    expect(scrollRegions).toHaveLength(1);
    const scrollRegion = scrollRegions[0];
    expect(scrollRegion.classList.contains("tree-person-picker__list")).toBe(true);

    const searchBox = screen.getByRole("searchbox", { name: "Tìm người để xét" });
    expect(scrollRegion.contains(searchBox)).toBe(false);

    const status = screen.getByRole("status");
    expect(scrollRegion.contains(status)).toBe(false);
  });
});
