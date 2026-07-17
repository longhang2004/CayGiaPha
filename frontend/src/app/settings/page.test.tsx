import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/apiClient";

const push = vi.fn();
const refresh = vi.fn().mockResolvedValue(undefined);
const patch = vi.fn();
const get = vi.fn().mockResolvedValue([]);
const post = vi.fn();
const del = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/apiClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiClient")>("@/lib/apiClient");
  return {
    ...actual,
    api: {
      ...actual.api,
      patch: (...args: unknown[]) => patch(...args),
      get: (...args: unknown[]) => get(...args),
      post: (...args: unknown[]) => post(...args),
      del: (...args: unknown[]) => del(...args),
    },
  };
});

const sessionState = {
  user: {
    userId: "u1",
    treeId: "t1",
    identifier: "user@example.com",
    displayName: null as string | null,
    verified: true,
    role: "user" as const,
  },
  loading: false,
  refresh,
};

vi.mock("@/app/providers", () => ({
  useSession: () => sessionState,
}));
vi.mock("@/components/settings/DataRightsPanel", () => ({
  DataRightsPanel: () => <section aria-label="Quyền dữ liệu của bạn" />,
}));

import SettingsPage from "./page";

afterEach(() => {
  vi.clearAllMocks();
  sessionState.user = {
    userId: "u1",
    treeId: "t1",
    identifier: "user@example.com",
    displayName: null,
    verified: true,
    role: "user",
  };
  sessionState.loading = false;
  get.mockResolvedValue([]);
});

describe("SettingsPage profile editor", () => {
  it("places canonical legal links before data rights", () => {
    render(<SettingsPage />);

    const legalHeading = screen.getByRole("heading", { name: "Pháp lý và quyền riêng tư" });
    const dataRights = screen.getByRole("region", { name: "Quyền dữ liệu của bạn" });
    expect(legalHeading.compareDocumentPosition(dataRights) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("link", { name: "Điều khoản dịch vụ" })).toHaveAttribute(
      "href",
      "/legal/tos",
    );
    expect(screen.getByRole("link", { name: "Chính sách quyền riêng tư" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });

  it("shows legacy prompt when displayName is missing", () => {
    render(<SettingsPage />);
    expect(
      screen.getByText("Thêm tên hiển thị để người thân dễ nhận ra bạn khi cộng tác."),
    ).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("Định danh đăng nhập (chỉ đọc).")).toBeInTheDocument();
  });

  it("saves display name, shows success, and refreshes session", async () => {
    patch.mockResolvedValue({ userId: "u1", displayName: "Nguyễn Văn A" });

    render(<SettingsPage />);

    const input = screen.getByLabelText(/Tên hiển thị/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Nguyễn Văn A");
    await userEvent.click(screen.getByRole("button", { name: /Lưu tên/i }));

    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith("/me/profile", { displayName: "Nguyễn Văn A" });
    });
    expect(await screen.findByText("Đã cập nhật tên hiển thị.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("disables the form while saving", async () => {
    let resolvePatch: (value: unknown) => void = () => {};
    patch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        }),
    );

    render(<SettingsPage />);
    await userEvent.type(screen.getByLabelText(/Tên hiển thị/i), "Tên mới");
    await userEvent.click(screen.getByRole("button", { name: /Lưu tên/i }));

    expect(screen.getByLabelText(/Tên hiển thị/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /Đang lưu/i })).toBeDisabled();

    resolvePatch({ userId: "u1", displayName: "Tên mới" });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows field-level validation error", async () => {
    patch.mockRejectedValue(
      new ApiError(400, {
        code: "validation_error",
        field: "displayName",
        message: "Tên hiển thị phải từ 1 đến 100 ký tự.",
      }),
    );

    render(<SettingsPage />);
    await userEvent.type(screen.getByLabelText(/Tên hiển thị/i), "X");
    await userEvent.click(screen.getByRole("button", { name: /Lưu tên/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tên hiển thị phải từ 1 đến 100 ký tự.",
    );
  });

  it("requires a non-empty display name before calling the API", async () => {
    sessionState.user.displayName = "Đã có tên";
    render(<SettingsPage />);

    await userEvent.click(screen.getByRole("button", { name: /Sửa tên/i }));
    const input = screen.getByLabelText(/Tên hiển thị/i);
    await userEvent.clear(input);
    await userEvent.click(screen.getByRole("button", { name: /Lưu tên/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Vui lòng nhập tên hiển thị.");
    expect(patch).not.toHaveBeenCalled();
  });
});
