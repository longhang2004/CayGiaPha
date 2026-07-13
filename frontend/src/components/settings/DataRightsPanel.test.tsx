import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/lib/apiClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiClient")>("@/lib/apiClient");
  return {
    ...actual,
    api: { get: mocks.get, post: mocks.post, del: mocks.del },
  };
});

import { DataRightsPanel } from "./DataRightsPanel";

const node = {
  personId: "p1",
  treeId: "t1",
  displayName: "Nguyễn Văn A",
  treeName: "Gia đình Nguyễn",
  claimedAt: "2026-07-13T00:00:00.000Z",
};

describe("DataRightsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue([node]);
    mocks.post.mockResolvedValue(undefined);
    mocks.del.mockResolvedValue(undefined);
  });

  it("lists linked nodes and exposes export and correction paths", async () => {
    render(<DataRightsPanel />);
    expect(await screen.findByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith("/me/nodes");
    expect(screen.getByRole("button", { name: "Tải dữ liệu JSON" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở hồ sơ để chỉnh sửa" })).toHaveAttribute(
      "href",
      "/tree/t1?person=p1&edit=true",
    );
  });

  it("sends the selected Requirement 15 deletion choice only after confirmation", async () => {
    render(<DataRightsPanel />);
    await screen.findByText("Nguyễn Văn A");
    await userEvent.selectOptions(screen.getByLabelText("Yêu cầu xóa hoặc ẩn danh"), "delete-preserve");
    await userEvent.click(screen.getByRole("button", { name: "Xem lại yêu cầu" }));

    const submit = screen.getByRole("button", { name: "Xác nhận yêu cầu" });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: /Tôi hiểu hậu quả/i }));
    await userEvent.click(submit);

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith("/me/nodes/p1/erase", {
        strategy: "delete",
        deletionStrategy: "preserve",
      });
    });
  });

  it("requires the exact phrase before deleting the account", async () => {
    render(<DataRightsPanel />);
    await screen.findByText("Nguyễn Văn A");
    const deleteButton = screen.getByRole("button", { name: "Xóa tài khoản vĩnh viễn" });
    expect(deleteButton).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText(/Nhập “XÓA TÀI KHOẢN”/i),
      "XÓA TÀI KHOẢN",
    );
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(mocks.del).toHaveBeenCalledWith("/me/account", {
        body: { linkedNodeStrategy: "anonymize" },
      });
      expect(mocks.push).toHaveBeenCalledWith("/");
    });
  });
});
