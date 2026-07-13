import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";

const mocks = vi.hoisted(() => ({
  deleteReminder: vi.fn(),
  getPendingInvitations: vi.fn(),
  getReminders: vi.fn(),
  markReminderAsRead: vi.fn(),
  apiGet: vi.fn(),
  push: vi.fn(),
  user: { userId: "user-1" },
}));

vi.mock("@/lib/persons", () => ({
  deleteReminder: mocks.deleteReminder,
  getReminders: mocks.getReminders,
  markReminderAsRead: mocks.markReminderAsRead,
}));

vi.mock("@/lib/collaboration", () => ({
  getPendingInvitations: mocks.getPendingInvitations,
}));

vi.mock("@/lib/apiClient", () => ({
  api: { get: mocks.apiGet },
}));

vi.mock("@/app/providers", () => ({
  useSession: () => ({ user: mocks.user }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getReminders.mockResolvedValue([
      {
        id: "reminder-1",
        title: "Ngày giỗ sắp tới",
        content: "Còn ba ngày nữa.",
        isRead: false,
      },
    ]);
    mocks.getPendingInvitations.mockResolvedValue([]);
    mocks.apiGet.mockResolvedValue([{ id: "tree-1", accessRole: "OWNER" }]);
    mocks.markReminderAsRead.mockResolvedValue(undefined);
    mocks.deleteReminder.mockResolvedValue(undefined);
  });

  it("opens notifications in the shared CGP popover and preserves reminder actions", async () => {
    const user = userEvent.setup();
    render(<NotificationBell align="left" />);

    await waitFor(() => expect(mocks.getReminders).toHaveBeenCalledOnce());
    const trigger = screen.getByRole("button", {
      name: "Thông báo, 1 chưa đọc",
    });
    await user.click(trigger);

    expect(
      screen.getByRole("dialog", { name: "Thông báo dòng họ" }),
    ).toHaveClass("cgp-popover__dialog", "cgp-popover__dialog--md");
    expect(screen.getByText("1 chưa đọc")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Đánh dấu đã đọc" }));
    expect(mocks.markReminderAsRead).toHaveBeenCalledWith("reminder-1");
    expect(screen.queryByText("1 chưa đọc")).not.toBeInTheDocument();
    expect(trigger).toHaveAccessibleName("Thông báo");

    await user.click(screen.getByTitle("Xóa thông báo"));
    expect(mocks.deleteReminder).toHaveBeenCalledWith("reminder-1");
    expect(screen.getByText("Không có thông báo nào.")).toBeInTheDocument();
  });

  it("closes before navigating to collaboration settings", async () => {
    mocks.getPendingInvitations.mockResolvedValue([
      { id: "invite-1", email: "nguoidung@example.com" },
    ]);
    const user = userEvent.setup();
    render(<NotificationBell />);

    await waitFor(() =>
      expect(mocks.getPendingInvitations).toHaveBeenCalledWith("tree-1"),
    );
    await user.click(
      screen.getByRole("button", { name: "Thông báo, 2 chưa đọc" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Mở quản lý cộng tác" }),
    );

    expect(mocks.push).toHaveBeenCalledWith("/tree/tree-1?collaboration=true");
    expect(
      screen.queryByRole("dialog", { name: "Thông báo dòng họ" }),
    ).not.toBeInTheDocument();
  });
});
