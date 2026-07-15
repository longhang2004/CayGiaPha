import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TreeWorkspaceSurface } from "./TreeWorkspaceSurface";
import { Person } from "@/lib/graph";
import { Address } from "@/lib/graph";
import { writeTreeWorkspaceViewMode } from "@/lib/tree-workspace/viewMode";

describe("TreeWorkspaceSurface", () => {
  beforeEach(() => {
    writeTreeWorkspaceViewMode("list");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps both panels mounted, makes the hidden panel inert, and switches modes", () => {
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
        accessRole="OWNER"
        graphContent={<div data-testid="graph-content">Graph View</div>}
      />
    );

    expect(screen.getByText("Người thân gần")).toBeInTheDocument();
    expect(screen.getByTestId("graph-content")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Danh sách" })).toBeInTheDocument();
    expect(document.querySelector("#panel-graph")).toHaveAttribute("inert");
    expect(document.querySelector("#panel-list")).not.toHaveAttribute("inert");

    fireEvent.click(screen.getByRole("tab", { name: "Sơ đồ" }));
    expect(screen.getByRole("tabpanel", { name: "Sơ đồ" })).toBeInTheDocument();
    expect(document.querySelector("#panel-list")).toHaveAttribute("inert");
    expect(document.querySelector("#panel-graph")).not.toHaveAttribute("inert");
  });

  it("removes inert from both panels when its container enters split view", async () => {
    class ResizeObserverMock {
      private callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe() {
        this.callback([{ contentRect: { width: 1000 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }

      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    render(
      <TreeWorkspaceSurface
        persons={[{ id: "1", displayName: "Nguyễn Văn A" } as Person]}
        relationships={[]}
        addresses={new Map()}
        egoId="1"
        selectedId={null}
        onSelectPerson={vi.fn()}
        accessRole="READER"
        graphContent={<div>Graph View</div>}
      />,
    );

    await waitFor(() => expect(document.querySelector(".tree-workspace-surface")).toHaveAttribute("data-layout", "split"));
    expect(screen.queryByRole("tablist", { name: "Chọn chế độ xem" })).not.toBeInTheDocument();
    expect(document.querySelector("#panel-list")).not.toHaveAttribute("inert");
    expect(document.querySelector("#panel-graph")).not.toHaveAttribute("inert");
  });
});
