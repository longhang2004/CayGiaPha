import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  post: vi.fn(),
  user: { consentRequired: true } as { consentRequired: boolean } | null,
}));

vi.mock("@/app/providers", () => ({
  useSession: () => ({ user: mocks.user, loading: false, refresh: mocks.refresh }),
}));
vi.mock("@/lib/apiClient", () => ({ api: { post: mocks.post } }));

import { ConsentReacceptanceDialog } from "./ConsentReacceptanceDialog";

describe("ConsentReacceptanceDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { consentRequired: true };
    mocks.post.mockResolvedValue({ consentRequired: false });
    mocks.refresh.mockResolvedValue(undefined);
  });

  it("does not render when current consent is already recorded", () => {
    mocks.user = { consentRequired: false };
    render(<ConsentReacceptanceDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("links both documents and records explicit reacceptance", async () => {
    render(<ConsentReacceptanceDialog />);

    expect(screen.getByRole("link", { name: "Điều khoản dịch vụ" })).toHaveAttribute(
      "href",
      "/legal/tos",
    );
    expect(screen.getByRole("link", { name: "Chính sách quyền riêng tư" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
    const accept = screen.getByRole("button", { name: "Đồng ý và tiếp tục" });
    expect(accept).toBeDisabled();

    await userEvent.click(
      screen.getByRole("checkbox", { name: /Tôi đã đọc và đồng ý/i }),
    );
    await userEvent.click(accept);

    expect(mocks.post).toHaveBeenCalledWith("/me/consent", {
      acceptedTos: true,
      acceptedPrivacy: true,
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("keeps a visible path to reopen consent after dismissal", async () => {
    render(<ConsentReacceptanceDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Đóng cửa sổ" }));

    const reopen = screen.getByRole("button", { name: "Xem lại điều khoản cập nhật" });
    await userEvent.click(reopen);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("uses a prototype adapter without calling the live consent API", async () => {
    const acknowledge = vi.fn().mockResolvedValue(undefined);
    render(<ConsentReacceptanceDialog acknowledge={acknowledge} />);

    await userEvent.click(screen.getByRole("checkbox", { name: /Tôi đã đọc và đồng ý/i }));
    await userEvent.click(screen.getByRole("button", { name: "Đồng ý và tiếp tục" }));

    expect(acknowledge).toHaveBeenCalledOnce();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
