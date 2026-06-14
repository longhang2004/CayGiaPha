import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClaimFlow } from "./ClaimFlow";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ClaimFlow invite", () => {
  it("posts the invite body with treeId and destination", async () => {
    const fetchMock = mockFetch({ ok: true, status: 200 });

    render(<ClaimFlow personId="p1" treeId="t1" />);

    await userEvent.type(
      screen.getByLabelText("Số điện thoại hoặc email", { selector: "#invite-destination" }),
      "user@example.com",
    );
    await userEvent.click(screen.getByRole("button", { name: "Gửi lời mời" }));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/persons/p1/invite");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      treeId: "t1",
      destination: "user@example.com",
    });
    expect(await screen.findByTestId("invite-sent")).toBeInTheDocument();
  });

  it("shows an already-claimed error from the envelope", async () => {
    mockFetch({
      ok: false,
      status: 409,
      body: { error: { code: "ALREADY_CLAIMED", message: "Node đã được xác nhận" } },
    });

    render(<ClaimFlow personId="p1" treeId="t1" />);
    await userEvent.type(
      screen.getByLabelText("Số điện thoại hoặc email", { selector: "#invite-destination" }),
      "0900000000",
    );
    await userEvent.click(screen.getByRole("button", { name: "Gửi lời mời" }));

    expect(await screen.findByTestId("invite-error")).toHaveTextContent("Node đã được xác nhận");
  });
});

describe("ClaimFlow claim by code", () => {
  it("posts the claim/verify body with identifier and code", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      body: { personId: "p1", claimed: true },
    });

    render(<ClaimFlow personId="p1" treeId="t1" />);

    await userEvent.type(
      screen.getByLabelText("Số điện thoại hoặc email", { selector: "#claim-identifier" }),
      "user@example.com",
    );
    await userEvent.type(screen.getByLabelText("Mã xác nhận"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận" }));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/persons/p1/claim/verify");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      treeId: "t1",
      identifier: "user@example.com",
      code: "123456",
    });
    expect(await screen.findByTestId("claim-success")).toBeInTheDocument();
  });

  it("surfaces a wrong-code field error from the envelope", async () => {
    mockFetch({
      ok: false,
      status: 400,
      body: { error: { code: "INVALID_CODE", field: "code", message: "Mã không hợp lệ" } },
    });

    render(<ClaimFlow personId="p1" treeId="t1" />);
    await userEvent.type(
      screen.getByLabelText("Số điện thoại hoặc email", { selector: "#claim-identifier" }),
      "user@example.com",
    );
    await userEvent.type(screen.getByLabelText("Mã xác nhận"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận" }));

    expect(await screen.findByText("Mã không hợp lệ")).toBeInTheDocument();
    expect(screen.getByLabelText("Mã xác nhận")).toHaveAttribute("aria-invalid", "true");
  });
});
