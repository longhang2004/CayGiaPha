import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddRelativeForm } from "./AddRelativeForm";

interface MockResponse {
  ok: boolean;
  status: number;
  body?: unknown;
}

function mockFetch(response: MockResponse) {
  const fetchMock = vi.fn(async () => {
    return {
      ok: response.ok,
      status: response.status,
      text: async () => (response.body === undefined ? "" : JSON.stringify(response.body)),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const PERSONS = [
  { id: "a", displayName: "Người A" },
  { id: "b", displayName: "Người B" },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AddRelativeForm", () => {
  it("explains birth order using the Southern calling convention", async () => {
    render(<AddRelativeForm treeId="t1" persons={PERSONS} />);
    await userEvent.click(screen.getByLabelText("Thêm người thân mới vào cây"));
    expect(
      screen.getByRole("spinbutton", {
        name: "Thứ tự sinh trong anh chị em ruột (tùy chọn)",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 = con đầu, miền Nam gọi Hai.")).toBeInTheDocument();
  });

  it("explains the responsibility for another person's data", () => {
    render(<AddRelativeForm treeId="t1" persons={PERSONS} />);
    expect(screen.getByRole("note")).toHaveTextContent(/quyền riêng tư/i);
  });

  it("sends a derived bloodline edge in derived mode", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 201,
      body: { id: "r1", type: "bloodline_father", derivationState: "derived" },
    });

    render(<AddRelativeForm treeId="t1" persons={PERSONS} />);
    await userEvent.click(screen.getByRole("button", { name: "Thêm kết nối" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/relationships");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      treeId: "t1",
      type: "bloodline_father",
      sourceId: "a",
      targetId: "b",
    });
  });

  it("creates a new person and relationship through one atomic endpoint", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 201,
      body: {
        personId: "new-person",
        relationship: { id: "r-new", type: "bloodline_father", derivationState: "derived" },
      },
    });

    render(<AddRelativeForm treeId="t1" persons={PERSONS} />);
    await userEvent.click(screen.getByLabelText("Thêm người thân mới vào cây"));
    await userEvent.type(await screen.findByLabelText(/Họ và tên/), "Người mới");
    await userEvent.click(screen.getByRole("button", { name: "Thêm thành viên mới" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/trees/t1/relatives");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({
      person: { displayName: "Người mới", gender: "male" },
      relationship: {
        type: "bloodline_father",
        existingPersonId: "a",
        newPersonPosition: "target",
      },
    });
  });

  it("sends type='asserted' with the label in asserted mode", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 201,
      body: { id: "r2", type: "asserted", derivationState: "asserted" },
    });

    render(<AddRelativeForm treeId="t1" persons={PERSONS} />);

    await userEvent.click(screen.getByLabelText(/tự điền tên gọi/));
    await userEvent.type(screen.getByLabelText(/Nhãn xưng hô/), "bác");
    await userEvent.click(screen.getByRole("button", { name: "Thêm kết nối" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/relationships");
    expect(JSON.parse(init.body as string)).toEqual({
      treeId: "t1",
      type: "asserted",
      sourceId: "a",
      targetId: "b",
      assertedLabel: "bác",
    });
  });

  it("renders a conflict warning showing both the asserted label and derived term", async () => {
    mockFetch({
      ok: true,
      status: 201,
      body: {
        id: "r3",
        type: "bloodline_father",
        derivationState: "conflict",
        conflicts: [
          { sourceId: "a", targetId: "b", assertedLabel: "bác", derivedTerm: "chú" },
        ],
      },
    });

    render(<AddRelativeForm treeId="t1" persons={PERSONS} />);
    await userEvent.click(screen.getByRole("button", { name: "Thêm kết nối" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByTestId("asserted-label")).toHaveTextContent("bác");
    expect(screen.getByTestId("derived-term")).toHaveTextContent("chú");
  });

  it("surfaces a field-level error from the error envelope", async () => {
    mockFetch({
      ok: false,
      status: 400,
      body: {
        error: { code: "validation_error", field: "assertedLabel", message: "Nhãn không hợp lệ" },
      },
    });

    render(<AddRelativeForm treeId="t1" persons={PERSONS} />);
    await userEvent.click(screen.getByLabelText(/tự điền tên gọi/));
    await userEvent.type(screen.getByLabelText(/Nhãn xưng hô/), "x");
    await userEvent.click(screen.getByRole("button", { name: "Thêm kết nối" }));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận lưu" }));

    expect(await screen.findByText("Nhãn không hợp lệ")).toBeInTheDocument();
  });

  it("prevents native form submission", async () => {
    render(<AddRelativeForm treeId="t1" persons={PERSONS} />);
    const form = screen.getByRole("form");
    const submitEvent = new Event("submit", { cancelable: true, bubbles: true });
    vi.spyOn(submitEvent, "preventDefault");
    act(() => {
      form.dispatchEvent(submitEvent);
    });
    expect(submitEvent.preventDefault).toHaveBeenCalled();
  });

  it("shows discard confirmation on cancel when new person gender has been modified", async () => {
    const onCancelMock = vi.fn();
    render(<AddRelativeForm treeId="t1" persons={PERSONS} onCancel={onCancelMock} />);

    // Enable isNewPerson
    await userEvent.click(screen.getByLabelText("Thêm người thân mới vào cây"));

    // Select Nữ (female) gender radio button
    const femaleRadio = screen.getByLabelText("Nữ");
    await userEvent.click(femaleRadio);

    // Click Hủy (cancel) button
    const cancelBtn = screen.getByRole("button", { name: "Hủy" });
    await userEvent.click(cancelBtn);

    // Expect discard confirmation screen to be shown
    expect(screen.getByText("Hủy bỏ thay đổi?")).toBeInTheDocument();
    expect(onCancelMock).not.toHaveBeenCalled();

    // Click Xác nhận hủy
    const confirmCancelBtn = screen.getByRole("button", { name: "Xác nhận hủy" });
    await userEvent.click(confirmCancelBtn);
    expect(onCancelMock).toHaveBeenCalledTimes(1);
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

    render(<AddRelativeForm treeId="t1" persons={PERSONS} />);
    await userEvent.click(screen.getByRole("button", { name: "Thêm kết nối" }));

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
        text: async () => JSON.stringify({ id: "r1", type: "bloodline_father", derivationState: "derived" }),
      } as Response);
    }

    await submitPromise;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
