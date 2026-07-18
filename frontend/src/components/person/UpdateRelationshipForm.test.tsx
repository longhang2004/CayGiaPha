import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Person, Relationship } from "@/lib/graph";
import { UpdateRelationshipForm } from "./UpdateRelationshipForm";

const PERSONS: Person[] = [
  { id: "anchor", displayName: "Ông An", gender: "male" },
  { id: "direct", displayName: "Bà Bình", gender: "female" },
  { id: "asserted", displayName: "Anh Cường", gender: "male" },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(body: unknown) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 201,
    text: async () => JSON.stringify(body),
  }) as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("UpdateRelationshipForm", () => {
  it("disables a primitive direct pair but keeps an asserted pair eligible", () => {
    const relationships: Relationship[] = [
      {
        id: "marriage",
        type: "marriage",
        sourceId: "anchor",
        targetId: "direct",
        derivationState: "derived",
      },
      {
        id: "asserted-edge",
        type: "asserted",
        sourceId: "anchor",
        targetId: "asserted",
        derivationState: "asserted",
        assertedLabel: "anh họ",
      },
    ];

    render(
      <UpdateRelationshipForm
        treeId="tree-1"
        persons={PERSONS}
        relationships={relationships}
        anchorId="anchor"
      />,
    );

    expect(screen.getByRole("option", { name: /Bà Bình.*đã có quan hệ trực tiếp/ })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Anh Cường" })).not.toBeDisabled();
  });

  it("adds a missing primitive relationship through POST relationships", async () => {
    const fetchMock = mockFetch({
      id: "new-edge",
      treeId: "tree-1",
      type: "bloodline_father",
      sourceId: "anchor",
      targetId: "asserted",
      derivationState: "conflict",
      conflicts: [
        {
          sourceId: "anchor",
          targetId: "asserted",
          assertedLabel: "anh họ",
          derivedTerm: "con",
        },
      ],
    });
    const onCreated = vi.fn();

    render(
      <UpdateRelationshipForm
        treeId="tree-1"
        persons={PERSONS}
        relationships={[{
          id: "asserted-edge",
          type: "asserted",
          sourceId: "anchor",
          targetId: "asserted",
          derivationState: "asserted",
          assertedLabel: "anh họ",
        }]}
        anchorId="anchor"
        onCreated={onCreated}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText("Thành viên cần nối"), "asserted");
    await userEvent.selectOptions(screen.getByLabelText("Quan hệ với Ông An"), "son");
    await userEvent.click(screen.getByRole("button", { name: "Cập nhật quan hệ" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    const warning = await screen.findByRole("alert");
    expect(warning).toHaveTextContent("anh họ");
    expect(onCreated).not.toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/relationships");
    expect(JSON.parse(init.body as string)).toEqual({
      treeId: "tree-1",
      type: "bloodline_father",
      sourceId: "anchor",
      targetId: "asserted",
    });
    await userEvent.click(screen.getByRole("button", { name: "Quay lại thông tin" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  it("offers the add-person flow when every other person is already directly connected", async () => {
    const onSwitchToAddPerson = vi.fn();
    render(
      <UpdateRelationshipForm
        treeId="tree-1"
        persons={PERSONS.slice(0, 2)}
        relationships={[{
          id: "marriage",
          type: "marriage",
          sourceId: "anchor",
          targetId: "direct",
          derivationState: "derived",
        }]}
        anchorId="anchor"
        onSwitchToAddPerson={onSwitchToAddPerson}
      />,
    );

    expect(screen.getByText("Không còn thành viên phù hợp để nối.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thêm người mới" }));
    expect(onSwitchToAddPerson).toHaveBeenCalledTimes(1);
  });

  it("does not expose asserted relationship creation", () => {
    render(
      <UpdateRelationshipForm
        treeId="tree-1"
        persons={PERSONS}
        relationships={[]}
        anchorId="anchor"
      />,
    );

    expect(screen.queryByText(/Quan hệ khác/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nhãn xưng hô/)).not.toBeInTheDocument();
  });
});
