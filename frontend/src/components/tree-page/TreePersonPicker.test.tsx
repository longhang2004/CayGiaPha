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
    expect(screen.getAllByRole("button", { name: /^Xem từ / })).toHaveLength(3);

    await user.type(screen.getByRole("searchbox", { name: "Tìm người làm góc nhìn" }), "nhut tien");
    expect(screen.getByRole("status")).toHaveTextContent("Tìm thấy 1 người");
    await user.click(screen.getByRole("button", { name: "Xem từ Hàng Nhựt Tiến" }));

    expect(onSelectPerson).toHaveBeenCalledWith("three");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
