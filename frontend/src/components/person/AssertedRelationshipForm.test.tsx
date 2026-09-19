import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Person, Relationship } from "@/lib/graph";
import { AssertedRelationshipForm } from "./AssertedRelationshipForm";

const PERSONS: Person[] = [
  { id: "anchor", displayName: "Nguyễn Thị Lan", gender: "female" },
  { id: "relative", displayName: "Nguyễn Văn Thành", gender: "male" },
  { id: "other", displayName: "Phạm Thị Mai", gender: "female" },
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

describe("AssertedRelationshipForm", () => {
  it("records a dashed kinship label between two existing people", async () => {
    const fetchMock = mockFetch({
      id: "rel-1",
      treeId: "tree-1",
      type: "asserted",
      sourceId: "anchor",
      targetId: "relative",
      derivationState: "asserted",
      assertedLabel: "bác",
    });
    const onCreated = vi.fn();

    render(
      <AssertedRelationshipForm
        treeId="tree-1"
        persons={PERSONS}
        relationships={[]}
        anchorId="anchor"
        onCreated={onCreated}
      />,
    );

    expect(screen.getByText(/chưa biết ông bà trung gian/i)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Người được gọi"), "relative");
    await userEvent.type(screen.getByLabelText("Cách gọi"), "bác");
    await userEvent.click(screen.getByRole("button", { name: "Ghi cách gọi" }));

    expect(screen.getByText(/Nguyễn Thị Lan gọi Nguyễn Văn Thành là bác/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      treeId: "tree-1",
      type: "asserted",
      sourceId: "anchor",
      targetId: "relative",
      assertedLabel: "bác",
    });
    expect(onCreated).toHaveBeenCalledOnce();
  });

  it("rejects a blank or overlong label before calling the API", async () => {
    const fetchMock = mockFetch({});
    render(
      <AssertedRelationshipForm
        treeId="tree-1"
        persons={PERSONS}
        relationships={[]}
        anchorId="anchor"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Ghi cách gọi" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/nhập cách gọi/i);
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("Cách gọi"), "x".repeat(51));
    await userEvent.click(screen.getByRole("button", { name: "Ghi cách gọi" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/50/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disables a person who already has a dashed label from this member", () => {
    const relationships: Relationship[] = [
      {
        id: "existing",
        type: "asserted",
        sourceId: "anchor",
        targetId: "relative",
        derivationState: "asserted",
        assertedLabel: "chú",
      },
    ];
    render(
      <AssertedRelationshipForm
        treeId="tree-1"
        persons={PERSONS}
        relationships={relationships}
        anchorId="anchor"
      />,
    );

    expect(screen.getByRole("option", { name: /Nguyễn Văn Thành/ })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Phạm Thị Mai" })).not.toBeDisabled();
  });

  it("disables a person already joined by a parent or spouse edge", () => {
    const relationships: Relationship[] = [
      {
        id: "father",
        type: "bloodline_father",
        sourceId: "relative",
        targetId: "anchor",
        derivationState: "derived",
      },
    ];
    render(
      <AssertedRelationshipForm
        treeId="tree-1"
        persons={PERSONS}
        relationships={relationships}
        anchorId="anchor"
      />,
    );

    expect(screen.getByRole("option", { name: /Nguyễn Văn Thành/ })).toBeDisabled();
    expect(screen.getByRole("option", { name: /đã có quan hệ cha, mẹ, con hoặc vợ\/chồng/ })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Phạm Thị Mai" })).not.toBeDisabled();
  });
});
