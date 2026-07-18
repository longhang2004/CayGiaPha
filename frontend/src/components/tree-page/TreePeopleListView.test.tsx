import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TreePeopleListView } from "./TreePeopleListView";
import { trackUxEvent } from "@/lib/analytics/uxEvents";

vi.mock("@/lib/analytics/uxEvents", () => ({
  trackUxEvent: vi.fn(),
  getUxViewportClass: vi.fn(() => "desktop"),
  getUxAccessRole: vi.fn((role: string) => role.toLowerCase()),
}));

const PERSONS = [
  { id: "ego", displayName: "Me", gender: "male" as const },
  { id: "father", displayName: "My Father", gender: "male" as const },
];

const ADDRESSES = new Map([
  ["ego", { personId: "ego", path: [], relationText: "Bản thân", label: "Tôi", resolved: "Tôi", status: "resolved" as const }],
  ["father", { personId: "father", path: ["father"], relationText: "Cha", label: "Cha", resolved: "Cha", status: "resolved" as const }],
]);

describe("TreePeopleListView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders list and tracks find_person when selecting a person", async () => {
    const onSelectPerson = vi.fn();

    render(
      <TreePeopleListView
        persons={PERSONS}
        relationships={[{
          id: "father-edge",
          type: "bloodline_father",
          sourceId: "father",
          targetId: "ego",
          derivationState: "verified",
        }]}
        addresses={ADDRESSES}
        egoId="ego"
        selectedId="ego"
        onSelectPerson={onSelectPerson}
        accessRole="OWNER"
      />
    );

    const pBtn = screen.getByRole("button", { name: /Chọn My Father/i });
    expect(pBtn).toHaveAttribute("data-guidance-anchor", "workspace-person-list");
    expect(document.querySelectorAll('[data-guidance-anchor="workspace-person-list"]')).toHaveLength(1);
    expect(document.querySelector(".tree-people-list")).not.toHaveAttribute(
      "data-guidance-anchor",
    );
    await userEvent.click(pBtn);

    expect(onSelectPerson).toHaveBeenCalledWith("father", expect.any(HTMLButtonElement));
    expect(trackUxEvent).toHaveBeenCalledWith("ux_core_flow_complete", {
      flow: "find_person",
      surface: "workspace_list",
      viewportClass: "desktop",
      accessRole: "owner",
      outcome: "completed",
    });

    // Check that trackUxEvent calls do not contain IDs, names, or query strings
    const calls = vi.mocked(trackUxEvent).mock.calls;
    for (const [, payload] of calls) {
      const p = payload as any;
      expect(p.query).toBeUndefined();
      expect(p.personId).toBeUndefined();
      expect(p.id).toBeUndefined();
      expect(p.name).toBeUndefined();
      expect(p.displayName).toBeUndefined();
    }
  });

  it("groups only primitive direct relationships as close relatives", () => {
    render(
      <TreePeopleListView
        persons={PERSONS}
        relationships={[{
          id: "father-edge",
          type: "bloodline_father",
          sourceId: "father",
          targetId: "ego",
          derivationState: "verified",
        }]}
        addresses={ADDRESSES}
        egoId="ego"
        selectedId="ego"
        onSelectPerson={vi.fn()}
        accessRole="READER"
      />
    );

    const closeGroup = screen.getByRole("region", { name: "Người thân gần" });
    expect(closeGroup).toHaveTextContent("My Father");
    expect(closeGroup).toHaveTextContent("Cha");
    expect(screen.getByRole("region", { name: "Các thành viên khác" })).toHaveTextContent("Me");
  });

  it("keeps search chrome outside the only scrollable list region and filters rows reactively", async () => {
    render(
      <TreePeopleListView
        persons={PERSONS}
        relationships={[{
          id: "father-edge",
          type: "bloodline_father",
          sourceId: "father",
          targetId: "ego",
          derivationState: "verified",
        }]}
        addresses={ADDRESSES}
        egoId="ego"
        selectedId={null}
        onSelectPerson={vi.fn()}
        accessRole="OWNER"
      />
    );

    const chrome = document.querySelector('[data-guidance-anchor="workspace-search"]');
    const scrollRegion = document.querySelector('[data-panel-scroll-region="people-list"]');
    expect(chrome).toBeInTheDocument();
    expect(scrollRegion).toBeInTheDocument();
    expect(scrollRegion).not.toContainElement(chrome as HTMLElement);

    await userEvent.type(screen.getByRole("searchbox", { name: "Tìm theo tên hoặc cách xưng hô" }), "cha");
    expect(screen.getByRole("region", { name: "Kết quả" })).toHaveTextContent("My Father");
    expect(screen.queryByRole("region", { name: "Người thân gần" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Chọn Me/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Xóa tìm kiếm và bộ lọc" }));
    expect(screen.getByRole("region", { name: "Người thân gần" })).toBeInTheDocument();
  });

  it("does not expose voice search or log text entered in local search", async () => {
    render(
      <TreePeopleListView
        persons={PERSONS}
        relationships={[]}
        addresses={ADDRESSES}
        egoId="ego"
        selectedId={null}
        onSelectPerson={vi.fn()}
        accessRole="OWNER"
      />
    );

    expect(screen.queryByRole("button", { name: /giọng nói|microphone/i })).not.toBeInTheDocument();
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Tìm theo tên hoặc cách xưng hô" }),
      "cha",
    );
    expect(trackUxEvent).not.toHaveBeenCalled();
  });

  it("filters by gender from the inline filter controls", async () => {
    render(
      <TreePeopleListView
        persons={[
          ...PERSONS,
          { id: "mother", displayName: "My Mother", gender: "female" },
        ]}
        relationships={[]}
        addresses={ADDRESSES}
        egoId="ego"
        selectedId={null}
        onSelectPerson={vi.fn()}
        accessRole="OWNER"
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Mở bộ lọc thành viên" }));
    await userEvent.selectOptions(screen.getByLabelText("Giới tính"), "female");

    const results = screen.getByRole("region", { name: "Kết quả" });
    expect(results).toHaveTextContent("My Mother");
    expect(results).not.toHaveTextContent("My Father");
    expect(screen.getByRole("button", { name: /Bộ lọc đang dùng: 1/ })).toBeInTheDocument();
  });
});
