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
  it("posts the right body to /persons on submit", async () => {
    const fetchMock = mockFetchQueue([{ ok: true, status: 201, body: { id: "p1" } }]);
    const onSuccess = vi.fn();

    render(<PersonForm mode="create" treeId="t1" onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText("Họ và tên"), "Anh");
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));

    // Default visibility stays private, so exactly one request is made.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/persons");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      displayName: "Anh",
      gender: "male",
      deathStatus: false,
    });
    expect(onSuccess).toHaveBeenCalledWith("p1");
  });

  it("includes optional birth fields and death status when provided", async () => {
    const fetchMock = mockFetchQueue([{ ok: true, status: 201, body: { id: "p2" } }]);

    render(<PersonForm mode="create" treeId="t1" />);

    await userEvent.type(screen.getByLabelText("Họ và tên"), "Bình");
    await userEvent.click(screen.getByLabelText("Nữ"));
    await userEvent.type(screen.getByLabelText(/Thứ tự sinh/), "2");
    await userEvent.type(screen.getByLabelText(/Năm sinh/), "1990");
    await userEvent.click(screen.getByLabelText(/Đã qua đời/));
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      displayName: "Bình",
      gender: "female",
      deathStatus: true,
      birthOrder: 2,
      birthYear: 1990,
    });
  });

  it("applies a non-default visibility change after creating the person", async () => {
    const fetchMock = mockFetchQueue([
      { ok: true, status: 201, body: { id: "p3" } },
      { ok: true, status: 200, body: {} },
    ]);

    render(<PersonForm mode="create" treeId="t1" />);

    await userEvent.type(screen.getByLabelText("Họ và tên"), "Châu");
    await userEvent.click(screen.getByLabelText(/Thông tin qua đời/));
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/persons/p3/visibility?treeId=t1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ visDeath: "public" });
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

    await userEvent.type(screen.getByLabelText("Họ và tên"), "X");
    await userEvent.click(screen.getByRole("button", { name: "Lưu thành viên" }));

    expect(await screen.findByText("Tên quá dài")).toBeInTheDocument();
    expect(screen.getByLabelText("Họ và tên")).toHaveAttribute("aria-invalid", "true");
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

    const nameInput = screen.getByLabelText("Họ và tên");
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
