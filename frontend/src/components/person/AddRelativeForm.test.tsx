import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  it("sends a derived bloodline edge in derived mode", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 201,
      body: { id: "r1", type: "bloodline_father", derivationState: "derived" },
    });

    render(<AddRelativeForm treeId="t1" persons={PERSONS} />);
    await userEvent.click(screen.getByRole("button", { name: "Thêm" }));

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

  it("sends type='asserted' with the label in asserted mode", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 201,
      body: { id: "r2", type: "asserted", derivationState: "asserted" },
    });

    render(<AddRelativeForm treeId="t1" persons={PERSONS} />);

    await userEvent.click(screen.getByLabelText(/khai báo/));
    await userEvent.type(screen.getByLabelText(/Nhãn xưng hô/), "bác");
    await userEvent.click(screen.getByRole("button", { name: "Thêm" }));

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
    await userEvent.click(screen.getByRole("button", { name: "Thêm" }));

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
    await userEvent.click(screen.getByLabelText(/khai báo/));
    await userEvent.type(screen.getByLabelText(/Nhãn xưng hô/), "x");
    await userEvent.click(screen.getByRole("button", { name: "Thêm" }));

    expect(await screen.findByText("Nhãn không hợp lệ")).toBeInTheDocument();
  });
});
