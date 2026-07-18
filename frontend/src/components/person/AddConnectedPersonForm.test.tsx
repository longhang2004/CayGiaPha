import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddConnectedPersonForm } from "./AddConnectedPersonForm";
import type { Person } from "@/lib/graph";

const EDIT_RELATIONSHIPS = {
  editContent: true,
  editRelationships: true,
  editPhotos: true,
  editVisibility: true,
  manageClaim: true,
  manageTree: false,
  manageCollaboration: false,
};

const PERSONS: Person[] = [
  {
    id: "selected",
    displayName: "Người đang chọn",
    gender: "male",
    capabilities: EDIT_RELATIONSHIPS,
  },
  {
    id: "ego",
    displayName: "Người đang xét",
    gender: "female",
    capabilities: EDIT_RELATIONSHIPS,
  },
  {
    id: "reader",
    displayName: "Người chỉ xem",
    gender: "male",
    capabilities: { ...EDIT_RELATIONSHIPS, editRelationships: false },
  },
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

function response(ok: boolean, status: number, body?: unknown): Response {
  return {
    ok,
    status,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as Response;
}

describe("AddConnectedPersonForm", () => {
  it("defaults to the selected editable anchor and excludes read-only anchors", () => {
    render(
      <AddConnectedPersonForm
        treeId="tree-1"
        persons={PERSONS}
        preferredAnchorId="selected"
        egoId="ego"
      />,
    );

    expect(screen.getByLabelText("Người mới có quan hệ với")).toHaveValue("selected");
    expect(screen.getByRole("option", { name: "Người đang chọn" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Người chỉ xem" })).not.toBeInTheDocument();
  });

  it("uses the ego when the preferred person cannot edit relationships", () => {
    render(
      <AddConnectedPersonForm
        treeId="tree-1"
        persons={PERSONS}
        preferredAnchorId="reader"
        egoId="ego"
      />,
    );

    expect(screen.getByLabelText("Người mới có quan hệ với")).toHaveValue("ego");
  });

  it("creates a new father through the atomic relatives endpoint", async () => {
    const fetchMock = mockFetch({
      personId: "new-person",
      relationship: {
        id: "relationship-1",
        type: "bloodline_father",
        derivationState: "derived",
      },
    });
    const onCreated = vi.fn();

    render(
      <AddConnectedPersonForm
        treeId="tree-1"
        persons={PERSONS}
        preferredAnchorId="selected"
        onCreated={onCreated}
      />,
    );
    await userEvent.type(screen.getByLabelText(/Họ và tên/), "Ông Minh");
    await userEvent.selectOptions(screen.getByLabelText("Quan hệ với người làm mốc"), "father");
    await userEvent.click(screen.getByRole("button", { name: "Thêm người mới" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("new-person"));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/trees/tree-1/relatives");
    expect(JSON.parse(init.body as string)).toMatchObject({
      person: { displayName: "Ông Minh", gender: "male" },
      relationship: {
        type: "bloodline_father",
        existingPersonId: "selected",
        newPersonPosition: "source",
      },
    });
  });

  it("keeps optional personal data behind progressive disclosure", async () => {
    render(
      <AddConnectedPersonForm treeId="tree-1" persons={PERSONS} />,
    );

    const details = screen.getByText("Thêm thông tin khác").closest("details");
    expect(details).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText("Thêm thông tin khác"));
    expect(details).toHaveAttribute("open");
    expect(screen.getByLabelText("Năm sinh (tùy chọn)")).toBeInTheDocument();
    expect(screen.getByLabelText("Ảnh đại diện (tùy chọn)")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png",
    );
    expect(screen.getByTestId("photo-file-dropzone")).toBeInTheDocument();
  });

  it("uploads the selected photo after creating the person", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(true, 201, {
          personId: "new-person",
          relationship: { id: "relationship-1", type: "bloodline_father" },
        }),
      )
      .mockResolvedValueOnce(response(true, 201, { id: "photo-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const onCreated = vi.fn();

    render(
      <AddConnectedPersonForm
        treeId="tree-1"
        persons={PERSONS}
        preferredAnchorId="selected"
        onCreated={onCreated}
      />,
    );
    await userEvent.type(screen.getByLabelText(/Họ và tên/), "Ông Minh");
    await userEvent.click(screen.getByText("Thêm thông tin khác"));
    const file = new File(["photo"], "ong-minh.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Ảnh đại diện (tùy chọn)"), file);
    await userEvent.click(screen.getByRole("button", { name: "Thêm người mới" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("new-person"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "/api/v1/persons/new-person/photos?treeId=tree-1",
    );
  });

  it("prevents duplicate creation when the person is saved but the photo upload fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(true, 201, {
          personId: "new-person",
          relationship: { id: "relationship-1", type: "bloodline_father" },
        }),
      )
      .mockResolvedValueOnce(
        response(false, 400, {
          error: { code: "VALIDATION_ERROR", field: "file", message: "Ảnh không hợp lệ" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const onCreated = vi.fn();

    render(
      <AddConnectedPersonForm
        treeId="tree-1"
        persons={PERSONS}
        preferredAnchorId="selected"
        onCreated={onCreated}
      />,
    );
    await userEvent.type(screen.getByLabelText(/Họ và tên/), "Ông Minh");
    await userEvent.click(screen.getByText("Thêm thông tin khác"));
    await userEvent.upload(
      screen.getByLabelText("Ảnh đại diện (tùy chọn)"),
      new File(["photo"], "ong-minh.png", { type: "image/png" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Thêm người mới" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    expect(await screen.findByText("Đã lưu thông tin của Ông Minh")).toBeInTheDocument();
    expect(screen.getByText("Ảnh chưa tải lên được. Mở hồ sơ để thử lại.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm người mới" })).not.toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Mở thông tin thành viên" }));
    expect(onCreated).toHaveBeenCalledOnce();
    expect(onCreated).toHaveBeenCalledWith("new-person");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not expose asserted relationship creation", () => {
    render(
      <AddConnectedPersonForm treeId="tree-1" persons={PERSONS} />,
    );

    expect(screen.queryByText(/Quan hệ khác/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nhãn xưng hô/)).not.toBeInTheDocument();
  });
});
