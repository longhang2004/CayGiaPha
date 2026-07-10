import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
const getInvitationDetails = vi.fn();
const joinTreeWithLink = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/collaboration", () => ({
  getInvitationDetails: (...args: unknown[]) => getInvitationDetails(...args),
  joinTreeWithLink: (...args: unknown[]) => joinTreeWithLink(...args),
}));

const sessionState = {
  user: {
    userId: "u1",
    treeId: null as string | null,
    identifier: "invitee@example.com",
    displayName: "Lê Thị C" as string | null,
    verified: true,
    role: "user" as const,
  },
  loading: false,
  refresh: vi.fn(),
};

vi.mock("@/app/providers", () => ({
  useSession: () => sessionState,
}));

import InvitationPage from "./page";

afterEach(() => {
  vi.clearAllMocks();
  sessionState.user = {
    userId: "u1",
    treeId: null,
    identifier: "invitee@example.com",
    displayName: "Lê Thị C",
    verified: true,
    role: "user",
  };
  sessionState.loading = false;
});

describe("InvitationPage account identity", () => {
  it("shows displayName primary and identifier secondary for approved invite", async () => {
    getInvitationDetails.mockResolvedValue({
      id: "inv-1",
      treeId: "tree-1",
      inviterUserId: "owner-1",
      email: "invitee@example.com",
      code: "123456",
      status: "approved",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    render(<InvitationPage params={{ id: "inv-1" }} />);

    await waitFor(() => {
      expect(screen.getByText("Lê Thị C")).toBeInTheDocument();
    });
    expect(document.querySelector(".account-identity__primary")).toHaveTextContent("Lê Thị C");
    expect(document.querySelector(".account-identity__secondary")).toHaveTextContent(
      "invitee@example.com",
    );
    expect(screen.getByText("Tài khoản hiện tại")).toBeInTheDocument();
  });

  it("falls back to identifier when displayName is null", async () => {
    sessionState.user.displayName = null;
    getInvitationDetails.mockResolvedValue({
      id: "inv-1",
      treeId: "tree-1",
      inviterUserId: "owner-1",
      email: null,
      code: "123456",
      status: "approved",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    render(<InvitationPage params={{ id: "inv-1" }} />);

    await waitFor(() => {
      expect(document.querySelector(".account-identity__primary")).toHaveTextContent(
        "invitee@example.com",
      );
    });
    expect(screen.getByRole("button", { name: /Chấp nhận lời mời/i })).toBeInTheDocument();
  });

  it("joins with the invite link when accepted", async () => {
    getInvitationDetails.mockResolvedValue({
      id: "inv-1",
      treeId: "tree-1",
      inviterUserId: "owner-1",
      email: "invitee@example.com",
      code: "123456",
      status: "approved",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    joinTreeWithLink.mockResolvedValue({ id: "c1" });

    render(<InvitationPage params={{ id: "inv-1" }} />);

    await waitFor(() => screen.getByRole("button", { name: /Chấp nhận lời mời/i }));
    await userEvent.click(screen.getByRole("button", { name: /Chấp nhận lời mời/i }));

    await waitFor(() => {
      expect(joinTreeWithLink).toHaveBeenCalledWith("inv-1");
      expect(push).toHaveBeenCalledWith("/tree/tree-1");
    });
  });
});
