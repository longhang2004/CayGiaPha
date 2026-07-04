import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegionSelector } from "./RegionSelector";

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

describe("RegionSelector", () => {
  it("PATCHes the chosen region", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      body: { treeId: "t1", region: "Nam" },
    });

    render(<RegionSelector treeId="t1" region="Bac" />);

    await userEvent.selectOptions(screen.getByLabelText("Cách xưng hô theo vùng miền"), "Nam");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/trees/t1/region");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ region: "Nam" });
    expect(await screen.findByTestId("region-saved")).toBeInTheDocument();
  });

  it("reverts and shows an error when the change is rejected", async () => {
    mockFetch({
      ok: false,
      status: 400,
      body: { error: { code: "validation_error", message: "Vùng không hợp lệ" } },
    });

    render(<RegionSelector treeId="t1" region="Bac" />);

    const select = screen.getByLabelText("Cách xưng hô theo vùng miền") as HTMLSelectElement;
    await userEvent.selectOptions(select, "Trung");

    expect(await screen.findByTestId("region-error")).toHaveTextContent("Vùng không hợp lệ");
    // Reverted to the previously stored region (9.6).
    expect(select.value).toBe("Bac");
  });
});
