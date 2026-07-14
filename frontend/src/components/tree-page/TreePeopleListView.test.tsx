import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TreePeopleListView } from "./TreePeopleListView";
import { trackUxEvent } from "@/lib/analytics/uxEvents";

vi.mock("@/lib/analytics/uxEvents", () => ({
  trackUxEvent: vi.fn(),
  getUxViewportClass: vi.fn(() => "desktop"),
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
    const onChangeEgo = vi.fn();

    render(
      <TreePeopleListView
        persons={PERSONS}
        addresses={ADDRESSES}
        egoId="ego"
        selectedId="ego"
        onSelectPerson={onSelectPerson}
        onChangeEgo={onChangeEgo}
      />
    );

    const pBtn = screen.getByRole("button", { name: /Chọn My Father/i });
    await userEvent.click(pBtn);

    expect(onSelectPerson).toHaveBeenCalledWith("father");
    expect(trackUxEvent).toHaveBeenCalledWith("ux_core_flow_complete", {
      flow: "find_person",
      surface: "workspace_list",
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
      <TreePeopleListView
        persons={PERSONS}
        addresses={ADDRESSES}
        egoId="ego"
        selectedId="ego"
        onSelectPerson={onSelectPerson}
        onChangeEgo={onChangeEgo}
      />
    );

    const changeEgoBtn = screen.getByRole("button", { name: /Đổi người làm góc nhìn/i });
    await userEvent.click(changeEgoBtn);

    expect(onChangeEgo).toHaveBeenCalledWith("father");
    expect(trackUxEvent).toHaveBeenCalledWith("ux_core_flow_complete", {
      flow: "change_viewpoint",
      surface: "workspace_list",
      viewportClass: "desktop",
      accessRole: "unknown",
      outcome: "completed",
    });
  });

  it("tracks find_person started when search input is focused/typed into", async () => {
    const onSelectPerson = vi.fn();
    const onChangeEgo = vi.fn();

    render(
      <TreePeopleListView
        persons={PERSONS}
        addresses={ADDRESSES}
        egoId="ego"
        selectedId="ego"
        onSelectPerson={onSelectPerson}
        onChangeEgo={onChangeEgo}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm theo tên hoặc vai vế.../i);
    await userEvent.type(searchInput, "M");

    expect(trackUxEvent).toHaveBeenCalledWith("ux_core_flow_start", {
      flow: "find_person",
      surface: "workspace_list",
      viewportClass: "desktop",
      accessRole: "unknown",
      outcome: "started",
    });
  });
});
