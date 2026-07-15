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
    await userEvent.click(pBtn);

    expect(onSelectPerson).toHaveBeenCalledWith("father");
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
});
