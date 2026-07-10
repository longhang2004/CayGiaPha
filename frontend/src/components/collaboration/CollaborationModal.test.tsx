import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CollaborationModal, CollaborationAdapter } from "./CollaborationModal";
import { MockSessionProvider } from "@/lib/prototype/mockSession";
import { ToastProvider } from "@/components/ui/ToastProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() })
}));

const mockAdapter: CollaborationAdapter = {
  getCollaborators: vi.fn().mockResolvedValue([]),
  getPendingInvitations: vi.fn().mockResolvedValue([]),
  inviteCollaborator: vi.fn(),
  createInviteLink: vi.fn(),
  approveInvitation: vi.fn(),
  rejectInvitation: vi.fn(),
  joinTreeGroup: vi.fn(),
};

describe("CollaborationModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    treeId: "test-tree",
    isOwner: true,
    adapter: mockAdapter,
  };

  const renderModal = (props = {}, sessionProps = {}) => {
    return render(
      <MockSessionProvider user={{ userId: "u1", identifier: "test@example.com", treeId: "test-tree", displayName: "Owner Name", ...sessionProps } as any}>
        <ToastProvider>
          <CollaborationModal {...defaultProps} {...props} />
        </ToastProvider>
      </MockSessionProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockAdapter.getCollaborators).mockResolvedValue([]);
    vi.mocked(mockAdapter.getPendingInvitations).mockResolvedValue([]);
  });

  it("shows owner-only sections when isOwner is true", async () => {
    renderModal({ isOwner: true });
    expect(screen.getByText("Thêm cộng tác viên mới")).toBeInTheDocument();
    expect(screen.getByText("Tạo mã mời chia sẻ")).toBeInTheDocument();
    await waitFor(() => expect(mockAdapter.getPendingInvitations).toHaveBeenCalled());
  });

  it("hides owner-only sections when isOwner is false", async () => {
    renderModal({ isOwner: false });
    expect(screen.queryByText("Thêm cộng tác viên mới")).not.toBeInTheDocument();
    expect(screen.queryByText("Tạo mã mời chia sẻ")).not.toBeInTheDocument();
    await waitFor(() => expect(mockAdapter.getCollaborators).toHaveBeenCalled());
  });

  it("prevents reload on join when isPrototype is true", async () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, reload: vi.fn() } as any;

    const mockJoin = vi.fn().mockResolvedValue({ status: "success" });

    renderModal({ isPrototype: true, adapter: { ...mockAdapter, joinTreeGroup: mockJoin } });

    const input = screen.getByPlaceholderText("Nhập mã 6 chữ số");
    fireEvent.change(input, { target: { value: "123456" } });

    const joinBtn = screen.getByRole("button", { name: "Tham gia" });
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(mockJoin).toHaveBeenCalledWith("123456");
      expect(window.location.reload).not.toHaveBeenCalled();
    });

    // @ts-ignore Restore location
    window.location = originalLocation;
  });

  it("does not render a generic owner card", async () => {
    vi.mocked(mockAdapter.getCollaborators).mockResolvedValue([
      {
        id: "c-owner",
        treeId: "test-tree",
        userId: "owner-uuid",
        displayName: "Chủ thật",
        email: "owner@example.com",
        role: "owner",
        joinedAt: new Date().toISOString(),
      } as any,
    ]);

    renderModal();
    await waitFor(() => expect(screen.getByText("Chủ thật")).toBeInTheDocument());
    expect(screen.queryByText("Chủ cây (Owner)")).not.toBeInTheDocument();
    expect(screen.queryByText("Quyền cao nhất")).not.toBeInTheDocument();
  });

  it("labels collaborators as displayName ?? email ?? Người dùng and never userId", async () => {
    vi.mocked(mockAdapter.getCollaborators).mockResolvedValue([
      {
        id: "c1",
        treeId: "test-tree",
        userId: "uuid-should-not-show",
        displayName: "Nguyễn Văn A",
        email: "a@example.com",
        role: "owner",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "c2",
        treeId: "test-tree",
        userId: "uuid-2",
        displayName: null,
        email: "b@example.com",
        role: "contributor",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "c3",
        treeId: "test-tree",
        userId: "uuid-3",
        displayName: null,
        email: null,
        role: "contributor",
        joinedAt: new Date().toISOString(),
      },
    ] as any);

    renderModal();

    await waitFor(() => {
      expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
      expect(screen.getByText("b@example.com")).toBeInTheDocument();
      expect(screen.getByText("Người dùng")).toBeInTheDocument();
    });

    expect(screen.queryByText("uuid-should-not-show")).not.toBeInTheDocument();
    expect(screen.queryByText("uuid-2")).not.toBeInTheDocument();
    expect(screen.queryByText("uuid-3")).not.toBeInTheDocument();
    expect(screen.getByText("Chủ cây")).toBeInTheDocument();
    expect(screen.getAllByText("Cộng tác viên")).toHaveLength(2);
  });
});
