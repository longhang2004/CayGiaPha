import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PersonForm } from "./PersonForm";

interface MockResponse {
  ok: boolean;
  status: number;
  body?: unknown;
}

/** Stub global fetch, returning a queue of responses (one per call). */
function mockFetchQueue(responses: MockResponse[]) {
  let call = 0;
  const fetchMock = vi.fn(async () => {
    const r = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return {
      ok: r.ok,
      status: r.status,
      text: async () => (r.body === undefined ? "" : JSON.stringify(r.body)),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PersonForm (create)", () => {
  it("uses the shared photo picker contract", () => {
    render(<PersonForm mode="create" treeId="t1" />);

    expect(screen.getByLabelText("Ảnh đại diện (tùy chọn)")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png",
    );
    expect(screen.getByTestId("photo-file-dropzone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chọn ảnh/ })).toBeInTheDocument();
  });

  it("explains the responsibility for another person's data", () => {
    render(<PersonForm mode="create" treeId="t1" />);
    expect(screen.getByRole("note")).toHaveTextContent(/cơ sở phù hợp/i);
    expect(screen.getByRole("link", { name: "Chính sách quyền riêng tư" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });

  it("explains birth order using the Southern calling convention", () => {
    render(<PersonForm mode="create" treeId="t1" />);
    expect(
      screen.getByRole("spinbutton", {
        name: "Thứ tự sinh trong anh chị em ruột (tùy chọn)",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 = con đầu, miền Nam gọi Hai.")).toBeInTheDocument();
  });

  it("posts the right body to /persons on submit", async () => {
    const fetchMock = mockFetchQueue([{ ok: true, status: 201, body: { id: "p1" } }]);
    const onSuccess = vi.fn();

    render(<PersonForm mode="create" treeId="t1" onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/Họ và tên/i), "Anh");
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    // Default visibility stays private, so exactly one request is made.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/persons");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      treeId: "t1",
      displayName: "Anh",
      gender: "male",
      deathStatus: false,
    });
    expect(onSuccess).toHaveBeenCalledWith("p1");
  });

  it("does not create the person twice when an optional photo upload fails", async () => {
    const fetchMock = mockFetchQueue([
      { ok: true, status: 201, body: { id: "p1" } },
      {
        ok: false,
        status: 400,
        body: { error: { code: "VALIDATION_ERROR", field: "file", message: "Ảnh lỗi" } },
      },
    ]);
    const onSuccess = vi.fn();

    render(<PersonForm mode="create" treeId="t1" onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText(/Họ và tên/i), "An");
    await userEvent.upload(
      screen.getByLabelText("Ảnh đại diện (tùy chọn)"),
      new File(["photo"], "an.png", { type: "image/png" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    expect(await screen.findByText("Đã lưu thông tin của An")).toBeInTheDocument();
    expect(screen.getByText("Ảnh chưa tải lên được. Mở hồ sơ để thử lại.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lưu thành viên" })).not.toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Mở thông tin thành viên" }));
    expect(onSuccess).toHaveBeenCalledWith("p1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("includes optional birth fields and death status when provided", async () => {
    const fetchMock = mockFetchQueue([{ ok: true, status: 201, body: { id: "p2" } }]);

    render(<PersonForm mode="create" treeId="t1" />);

    await userEvent.type(screen.getByLabelText(/Họ và tên/i), "Bình");
    await userEvent.selectOptions(screen.getByLabelText(/Giới tính/i), "Nữ");
    await userEvent.type(screen.getByLabelText(/Thứ tự sinh/), "2");
    await userEvent.type(screen.getByLabelText(/Năm sinh/), "1990");
    await userEvent.click(screen.getByLabelText(/Đã qua đời/));
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      treeId: "t1",
      displayName: "Bình",
      gender: "female",
      deathStatus: true,
      birthOrder: 2,
      birthYear: 1990,
    });
  });

  it("creates the person and requested relationship atomically", async () => {
    const fetchMock = mockFetchQueue([{
      ok: true,
      status: 201,
      body: {
        personId: "p-new",
        relationship: {
          id: "r-new",
          treeId: "t1",
          type: "bloodline_father",
          sourceId: "p-new",
          targetId: "p-existing",
          derivationState: "derived",
        },
      },
    }]);
    const onSuccess = vi.fn();

    render(
      <PersonForm
        mode="create"
        treeId="t1"
        persons={[{ id: "p-existing", displayName: "Người có sẵn" }]}
        onSuccess={onSuccess}
      />,
    );
    await userEvent.type(screen.getByLabelText(/Họ và tên/i), "Người mới");
    await userEvent.click(screen.getByLabelText("Thiết lập quan hệ ngay"));
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/trees/t1/relatives");
    expect(JSON.parse(init.body as string)).toEqual({
      person: { displayName: "Người mới", gender: "male", deathStatus: false },
      relationship: {
        type: "bloodline_father",
        existingPersonId: "p-existing",
        newPersonPosition: "source",
      },
    });
    expect(onSuccess).toHaveBeenCalledWith("p-new");
  });

  it("updates spouse marital status when editing a person with a spouse edge", async () => {
    const fetchMock = mockFetchQueue([
      { ok: true, status: 200, body: {} },
      {
        ok: true,
        status: 201,
        body: {
          id: "r1",
          treeId: "t1",
          type: "marriage",
          sourceId: "p3",
          targetId: "p4",
          maritalStatus: "divorced",
          derivationState: "derived",
        },
      },
    ]);

    render(
      <PersonForm
        mode="edit"
        treeId="t1"
        personId="p3"
        initialValues={{ displayName: "Châu", gender: "female" }}
        spouseRelationship={{ relationshipId: "r1", spouseId: "p4", maritalStatus: "married" }}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText(/Tình trạng hôn nhân/i), "divorced");
    await userEvent.click(screen.getByRole("button", { name: "Cập nhật thông tin" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/relationships/r1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      treeId: "t1",
      maritalStatus: "divorced",
    });
  });

  it("surfaces a field-level error from the error envelope", async () => {
    mockFetchQueue([
      {
        ok: false,
        status: 400,
        body: {
          error: { code: "validation_error", field: "displayName", message: "Tên quá dài" },
        },
      },
    ]);

    render(<PersonForm mode="create" treeId="t1" />);

    await userEvent.type(screen.getByLabelText(/Họ và tên/i), "X");
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    expect(await screen.findByText("Tên quá dài")).toBeInTheDocument();
    expect(screen.getByLabelText(/Họ và tên/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("prevents native form submission", async () => {
    render(<PersonForm mode="create" treeId="t1" />);
    const form = screen.getByRole("form");
    const submitEvent = new Event("submit", { cancelable: true, bubbles: true });
    vi.spyOn(submitEvent, "preventDefault");
    act(() => {
      form.dispatchEvent(submitEvent);
    });
    expect(submitEvent.preventDefault).toHaveBeenCalled();
  });
});

describe("PersonForm (edit)", () => {
  it("sends a partial edit PATCH with the tree id in the query", async () => {
    const fetchMock = mockFetchQueue([{ ok: true, status: 200, body: {} }]);

    render(
      <PersonForm
        mode="edit"
        treeId="t9"
        personId="p9"
        initialValues={{ displayName: "Cũ", gender: "male" }}
      />,
    );

    const nameInput = screen.getByLabelText(/Họ và tên/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Mới");
    await userEvent.click(screen.getByRole("button", { name: "Cập nhật thông tin" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/persons/p9?treeId=t9");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toMatchObject({
      displayName: "Mới",
      gender: "male",
    });
  });

  it("prevents multiple mutations on rapid double clicks of the confirmation button and disables controls while pending", async () => {
    let resolveFetch: any;
    const pendingPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn().mockImplementation(async () => {
      const res = await pendingPromise;
      return res;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonForm mode="create" treeId="t1" />);

    await userEvent.type(screen.getByLabelText(/Họ và tên/i), "Anh");
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));

    // Now rapid double-click the confirmation button
    const confirmBtn = screen.getByRole("button", { name: "Xác nhận lưu" });
    const backBtn = screen.getByRole("button", { name: "Quay lại chỉnh sửa" });

    expect(confirmBtn).not.toBeDisabled();
    expect(backBtn).not.toBeDisabled();

    const submitPromise = userEvent.click(confirmBtn);

    // Assert controls are disabled while pending
    await waitFor(() => {
      expect(confirmBtn).toBeDisabled();
      expect(backBtn).toBeDisabled();
    });

    // Try clicking again
    await userEvent.click(confirmBtn);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    if (resolveFetch) {
      resolveFetch({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ id: "p1" }),
      } as Response);
    }

    await submitPromise;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
