import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  it("explains the responsibility for another person's data", () => {
    render(<PersonForm mode="create" treeId="t1" />);
    expect(screen.getByRole("note")).toHaveTextContent(/cơ sở phù hợp/i);
    expect(screen.getByRole("link", { name: "Chính sách quyền riêng tư" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });

  it("posts the right body to /persons on submit", async () => {
    const fetchMock = mockFetchQueue([{ ok: true, status: 201, body: { id: "p1" } }]);
    const onSuccess = vi.fn();

    render(<PersonForm mode="create" treeId="t1" onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/Họ và tên/i), "Anh");
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));

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

  it("includes optional birth fields and death status when provided", async () => {
    const fetchMock = mockFetchQueue([{ ok: true, status: 201, body: { id: "p2" } }]);

    render(<PersonForm mode="create" treeId="t1" />);

    await userEvent.type(screen.getByLabelText(/Họ và tên/i), "Bình");
    await userEvent.selectOptions(screen.getByLabelText(/Giới tính/i), "Nữ");
    await userEvent.type(screen.getByLabelText(/Thứ tự sinh/), "2");
    await userEvent.type(screen.getByLabelText(/Năm sinh/), "1990");
    await userEvent.click(screen.getByLabelText(/Đã qua đời/));
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));

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
        spouseRelationship={{ spouseId: "p4", maritalStatus: "married" }}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText(/Tình trạng hôn nhân/i), "divorced");
    await userEvent.click(screen.getByRole("button", { name: "Cập nhật thông tin" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/relationships");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      treeId: "t1",
      type: "marriage",
      sourceId: "p3",
      targetId: "p4",
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

    expect(await screen.findByText("Tên quá dài")).toBeInTheDocument();
    expect(screen.getByLabelText(/Họ và tên/i)).toHaveAttribute("aria-invalid", "true");
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

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/persons/p9?treeId=t9");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toMatchObject({
      displayName: "Mới",
      gender: "male",
    });
  });
});
