import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TreeFocusView } from "./TreeFocusView";
import { trackUxEvent } from "@/lib/analytics/uxEvents";

vi.mock("@/lib/analytics/uxEvents", () => ({
  trackUxEvent: vi.fn(),
  getUxViewportClass: vi.fn(() => "desktop"),
}));

const PERSONS = [
  { id: "ego", displayName: "Me", gender: "male" as const },
  { id: "father", displayName: "My Father", gender: "male" as const },
];

const RELATIONSHIPS = [
  {
    id: "r1",
    treeId: "t1",
    type: "bloodline_father" as const,
    sourceId: "ego",
    targetId: "father",
    derivationState: "derived" as const,
  },
];

const ADDRESSES = new Map([
  ["ego", { personId: "ego", path: [], relationText: "Bản thân", label: "Tôi", resolved: "Tôi", status: "resolved" as const }],
  ["father", { personId: "father", path: ["father"], relationText: "Cha", label: "Cha", resolved: "Cha", status: "resolved" as const }],
]);

describe("TreeFocusView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly and tracks find_person when selecting a relation", async () => {
    const onSelectPerson = vi.fn();
    const onChangeEgo = vi.fn();

    render(
      <TreeFocusView
        persons={PERSONS}
        relationships={RELATIONSHIPS}
        addresses={ADDRESSES}
        egoId="ego"
        selectedId="ego"
        onSelectPerson={onSelectPerson}
        onChangeEgo={onChangeEgo}
      />
    );

    // Find the father button/card in relations
    const relationBtn = screen.getByRole("button", { name: /My Father/i });
    await userEvent.click(relationBtn);

    expect(onSelectPerson).toHaveBeenCalledWith("father");
    expect(trackUxEvent).toHaveBeenCalledWith("ux_core_flow_complete", {
      flow: "find_person",
      surface: "workspace_focus",
      viewportClass: "desktop",
      accessRole: "unknown",
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

  it("tracks change_viewpoint when changing the viewpoint", async () => {
    const onSelectPerson = vi.fn();
    const onChangeEgo = vi.fn();

    render(
      <TreeFocusView
        persons={PERSONS}
        relationships={RELATIONSHIPS}
        addresses={ADDRESSES}
        egoId="ego"
        selectedId="father"
        onSelectPerson={onSelectPerson}
        onChangeEgo={onChangeEgo}
      />
    );

    const changeEgoBtn = screen.getByRole("button", { name: /Đổi người làm góc nhìn/i });
    await userEvent.click(changeEgoBtn);

    expect(onChangeEgo).toHaveBeenCalledWith("father");
    expect(trackUxEvent).toHaveBeenCalledWith("ux_core_flow_complete", {
      flow: "change_viewpoint",
      surface: "workspace_focus",
      viewportClass: "desktop",
      accessRole: "unknown",
      outcome: "completed",
    });
  });
});
