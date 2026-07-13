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

    render(<ClaimFlow mode="invite" personId="p1" treeId="t1" />);

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

    render(<ClaimFlow mode="invite" personId="p1" treeId="t1" />);
    await userEvent.type(
      screen.getByLabelText("Số điện thoại hoặc email", { selector: "#invite-destination" }),
      "0900000000",
    );
    await userEvent.click(screen.getByRole("button", { name: "Gửi lời mời" }));

    expect(await screen.findByTestId("invite-error")).toHaveTextContent("Node đã được xác nhận");
  });

  it("supports an owner-invite prototype adapter without calling the production API", async () => {
    const inviteAction = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ClaimFlow
        mode="invite"
        personId="p1"
        treeId="t1"
        inviteAction={inviteAction}
      />,
    );
    await userEvent.type(screen.getByLabelText("Số điện thoại hoặc email"), "user@example.test");
    await userEvent.click(screen.getByRole("button", { name: "Gửi lời mời" }));

    expect(inviteAction).toHaveBeenCalledWith("user@example.test");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ClaimFlow claim by code", () => {
  it("posts only the code because identity comes from the authenticated session", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      body: { personId: "p1", treeId: "t1", claimed: true },
    });

    render(<ClaimFlow mode="verify" personId="p1" />);

    expect(screen.queryByLabelText("Số điện thoại hoặc email")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Mã xác nhận"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận đây là tôi" }));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/persons/p1/claim/verify");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
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

    render(<ClaimFlow mode="verify" personId="p1" />);
    await userEvent.type(screen.getByLabelText("Mã xác nhận"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận đây là tôi" }));

    expect(await screen.findByText("Mã không hợp lệ")).toBeInTheDocument();
    expect(screen.getByLabelText("Mã xác nhận")).toHaveAttribute("aria-invalid", "true");
  });

  it("supports a prototype adapter without calling the production API", async () => {
    const verifyAction = vi.fn().mockResolvedValue({
      personId: "p1",
      treeId: "prototype-tree",
      claimed: true,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ClaimFlow mode="verify" personId="p1" verifyAction={verifyAction} />);
    await userEvent.type(screen.getByLabelText("Mã xác nhận"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận đây là tôi" }));

    expect(verifyAction).toHaveBeenCalledWith("123456");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
