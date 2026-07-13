import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchPanel } from "./SearchPanel";

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

describe("SearchPanel", () => {
  it("opens the filters in the CGP popover dialog", async () => {
    render(<SearchPanel treeId="t1" />);

    const trigger = screen.getByRole("button", { name: "Bộ lọc" });
    await userEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Bộ lọc" });
    expect(dialog).toBeInTheDocument();
    expect(dialog.closest(".cgp-popover")).toHaveClass(
      "search-filter-cgp-popover",
      "cgp-popover--md",
    );
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("closes the filter popover with Escape and restores the trigger state", async () => {
    render(<SearchPanel treeId="t1" />);

    const trigger = screen.getByRole("button", { name: "Bộ lọc" });
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Bộ lọc" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Bộ lọc" })).not.toBeInTheDocument();
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("preserves the results dropdown outside-press behavior around the portaled filters", async () => {
    render(
      <SearchPanel
        treeId="t1"
        persons={[
          { id: "p1", displayName: "Anh A", gender: "male", birthYear: 1960 },
          { id: "p2", displayName: "Chị B", gender: "female", birthYear: 1965 },
        ]}
      />,
    );

    await userEvent.type(screen.getByLabelText("Tên"), "Anh");
    expect(await screen.findByText("Anh A")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Bộ lọc" }));
    fireEvent.mouseDown(screen.getByLabelText("Giới tính"));
    expect(screen.getByText("Anh A")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText("Anh A")).not.toBeInTheDocument());
  });

  it("posts the name query and viewpoint, then renders results", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      body: { results: [{ personId: "p1", displayName: "Anh A" }], noMatches: false },
    });

    render(<SearchPanel treeId="t1" viewpointId="v1" />);

    await userEvent.type(screen.getByLabelText("Tên"), "anh{Enter}");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/trees/t1/search");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      nameQuery: "anh",
      viewpointId: "v1",
    });

    expect(await screen.findByText("Anh A")).toBeInTheDocument();
  });

  it("sends combined filters intersected in a single filters object", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      body: { results: [{ personId: "p2", displayName: "Chú B" }], noMatches: false },
    });

    render(<SearchPanel treeId="t1" viewpointId="v1" />);

    await userEvent.click(screen.getByRole("button", { name: /Lọc/i }));
    await userEvent.selectOptions(screen.getByLabelText("Giới tính"), "male");
    await userEvent.selectOptions(screen.getByLabelText("Bên"), "paternal");
    await userEvent.type(screen.getByLabelText("Năm sinh từ"), "1950");
    await userEvent.type(screen.getByLabelText("đến"), "1980");
    await userEvent.selectOptions(screen.getByLabelText("Tình trạng mất"), "false");
    await userEvent.selectOptions(screen.getByLabelText("Trạng thái xác nhận"), "unclaimed");
    await userEvent.selectOptions(screen.getByLabelText("Loại quan hệ"), "bloodline");
    await userEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    fireEvent.submit(screen.getByRole("form", { name: "Tìm kiếm" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      viewpointId: "v1",
      filters: {
        gender: "male",
        side: "paternal",
        birthYearMin: 1950,
        birthYearMax: 1980,
        deathStatus: false,
        claimedStatus: "unclaimed",
        relationshipType: "bloodline",
      },
    });
  });

  it("shows the no-match indication when nothing matches", async () => {
    mockFetch({ ok: true, status: 200, body: { results: [], noMatches: true } });

    render(<SearchPanel treeId="t1" />);
    await userEvent.type(screen.getByLabelText("Tên"), "zzz{Enter}");

    expect(await screen.findByTestId("no-matches")).toBeInTheDocument();
  });

  it("surfaces a field-level error from the error envelope", async () => {
    mockFetch({
      ok: false,
      status: 400,
      body: {
        error: { code: "validation_error", field: "birthYearMin", message: "Khoảng năm không hợp lệ" },
      },
    });

    render(<SearchPanel treeId="t1" />);
    await userEvent.click(screen.getByRole("button", { name: /Lọc/i }));
    await userEvent.type(screen.getByLabelText("Năm sinh từ"), "2000");
    await userEvent.type(screen.getByLabelText("đến"), "1990");
    await userEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    fireEvent.submit(screen.getByRole("form", { name: "Tìm kiếm" }));

    expect(await screen.findByText("Khoảng năm không hợp lệ")).toBeInTheDocument();
    expect(screen.getByLabelText("Năm sinh từ")).toHaveAttribute("aria-invalid", "true");
  });

  it("filters locally on the frontend when persons and addresses are supplied", async () => {
    const personsList = [
      { id: "p1", displayName: "Hàng Hữu Phương", gender: "male" as const, birthYear: 1960 },
      { id: "p2", displayName: "Phạm Thị Cẩm Tú", gender: "female" as const, birthYear: 1965 },
    ];
    const addressesMap = new Map([
      ["p1", { personId: "p1", resolved: "ba", status: "resolved" }],
      ["p2", { personId: "p2", resolved: "má", status: "resolved" }],
    ]);

    const selectMock = vi.fn();

    render(
      <SearchPanel
        treeId="t1"
        persons={personsList}
        addresses={addressesMap}
        onSelectResult={selectMock}
      />
    );

    // Search for "ba"
    await userEvent.type(screen.getByLabelText("Tên"), "ba");

    // Hàng Hữu Phương should appear as his address matches "ba"
    const resultItem = await screen.findByText("Hàng Hữu Phương");
    expect(resultItem).toBeInTheDocument();

    // Clicking on it should trigger select callback
    await userEvent.click(resultItem);
    expect(selectMock).toHaveBeenCalledWith("p1");
  });
});
