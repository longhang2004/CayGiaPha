import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeletionDialog } from "./DeletionDialog";

interface MockResponse {
  ok: boolean;
  status: number;
  body?: unknown;
}

/** Stub global fetch with a queue of responses (one per call). */
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

const CHOICE_BODY = {
  personId: "p1",
  options: [{ strategy: "cascade" }, { strategy: "preserve" }],
};

describe("DeletionDialog", () => {
  it("calls DELETE (no mutation) and shows BOTH options without executing", async () => {
    const fetchMock = mockFetchQueue([{ ok: true, status: 200, body: CHOICE_BODY }]);

    render(<DeletionDialog personId="p1" treeId="t1" />);
    await userEvent.click(screen.getByRole("button", { name: "Xóa" }));

    // The prompt phase used DELETE and mutated nothing.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/persons/p1?treeId=t1");
    expect(init.method).toBe("DELETE");

    // Both options are presented (15.1).
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/Xóa theo dây chuyền/)).toBeInTheDocument();
    expect(screen.getByLabelText(/giữ lại những người liên quan/)).toBeInTheDocument();

    // No execute POST has been made yet.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does NOT POST when the dialog is dismissed (15.2)", async () => {
    const fetchMock = mockFetchQueue([{ ok: true, status: 200, body: CHOICE_BODY }]);

    render(<DeletionDialog personId="p1" treeId="t1" />);
    await userEvent.click(screen.getByRole("button", { name: "Xóa" }));
    await screen.findByRole("dialog");

    await userEvent.click(screen.getByRole("button", { name: "Hủy" }));

    // Still only the prompt DELETE — nothing executed.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("POSTs only the confirmed strategy after the owner selects one", async () => {
    const fetchMock = mockFetchQueue([
      { ok: true, status: 200, body: CHOICE_BODY },
      { ok: true, status: 200, body: { personId: "p1", strategy: "preserve" } },
    ]);
    const onDeleted = vi.fn();

    render(<DeletionDialog personId="p1" treeId="t1" onDeleted={onDeleted} />);
    await userEvent.click(screen.getByRole("button", { name: "Xóa" }));
    await screen.findByRole("dialog");

    await userEvent.click(screen.getByLabelText(/giữ lại những người liên quan/));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Xóa thành viên" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/persons/p1/delete");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ treeId: "t1", strategy: "preserve" });
    expect(onDeleted).toHaveBeenCalledWith("p1", "preserve");
  });
});
