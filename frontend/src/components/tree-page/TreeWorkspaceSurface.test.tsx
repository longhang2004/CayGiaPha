import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TreeWorkspaceSurface } from "./TreeWorkspaceSurface";
import { Person, Relationship } from "@/lib/graph";
import { Address } from "@/lib/graph";
import { writeTreeWorkspaceViewMode } from "@/lib/tree-workspace/viewMode";

describe("TreeWorkspaceSurface", () => {
  beforeEach(() => {
    writeTreeWorkspaceViewMode("focus");
  });

  it("renders focus view by default and switches modes", () => {
    const persons: Person[] = [{ id: "1", displayName: "Nguyễn Văn A" } as Person];
    const addresses = new Map<string, Address>([["1", { personId: "x", relation: "Tôi", resolved: "Tôi", status: "success" } as unknown as Address]]);

    render(
      <TreeWorkspaceSurface
        persons={persons}
        relationships={[]}
        addresses={addresses}
        egoId="1"
        selectedId="1"
        onSelectPerson={vi.fn()}
        onChangeEgo={vi.fn()}
        graphContent={<div data-testid="graph-content">Graph View</div>}
      />
    );

    // Initial view should be focus
    expect(screen.getByText("Nguyễn Văn A")).toBeDefined();
    expect(screen.getByText("Tôi")).toBeDefined();
    expect(screen.getByRole("tabpanel", { name: "Một người" })).toBeInTheDocument();

    // Switch to list
    fireEvent.click(screen.getByRole("tab", { name: "Danh sách" }));
    expect(screen.getByText("Danh sách thành viên")).toBeDefined();
    expect(screen.getByRole("tabpanel", { name: "Danh sách" })).toBeInTheDocument();

    // Switch to graph
    fireEvent.click(screen.getByRole("tab", { name: "Sơ đồ" }));
    expect(screen.getByTestId("graph-content")).toBeDefined();
    expect(screen.getByRole("tabpanel", { name: "Sơ đồ" })).toBeInTheDocument();
  });
});
