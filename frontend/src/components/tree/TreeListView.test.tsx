import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TreeListView } from "./TreeListView";

const trees = [
  {
    id: "tree-owner",
    name: "Gia phả họ Hàng",
    region: "Bac" as const,
    accessRole: "OWNER" as const,
  },
  {
    id: "tree-contributor",
    name: "Nhánh gia đình bên ngoại",
    region: "Trung" as const,
    accessRole: "CONTRIBUTOR" as const,
  },
];

describe("TreeListView", () => {
  it("renders an indexed tree catalog with truthful metadata and owner actions", async () => {
    const user = userEvent.setup();
    const onOpenTree = vi.fn();
    const onDeleteTree = vi.fn();

    render(
      <TreeListView
        trees={trees}
        onAddTree={vi.fn()}
        onOpenTree={onOpenTree}
        onDeleteTree={onDeleteTree}
      />,
    );

    expect(screen.getByText("2 cây gia phả")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("Chủ cây")).toBeInTheDocument();
    expect(screen.getByText("Cộng tác viên")).toBeInTheDocument();
    expect(screen.getByText("Bắc")).toBeInTheDocument();
    expect(screen.getByText("Trung")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Xem sơ đồ" })[1]);
    expect(onOpenTree).toHaveBeenCalledWith("tree-contributor");

    expect(screen.getAllByRole("button", { name: "Xóa" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    expect(onDeleteTree).toHaveBeenCalledWith("tree-owner", "Gia phả họ Hàng");
  });

  it("keeps the empty-state guidance and add-tree entry point", async () => {
    const user = userEvent.setup();
    const onAddTree = vi.fn();

    render(
      <TreeListView
        trees={[]}
        onAddTree={onAddTree}
        onOpenTree={vi.fn()}
        emptyGuidance={<div>Checklist bắt đầu</div>}
      />,
    );

    expect(screen.getByText("0 cây gia phả")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chào mừng bạn đến với Cây Gia Phả" })).toBeInTheDocument();
    expect(screen.getByText("Checklist bắt đầu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ Thêm cây" }));
    expect(onAddTree).toHaveBeenCalledTimes(1);
  });
});
