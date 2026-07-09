/**
 * Frontend API client helpers for co-building collaboration and invitations.
 */

import { api } from "./apiClient";

export interface CollaborationInvitation {
  id: string;
  treeId: string;
  inviterUserId: string;
  email: string | null;
  code: string;
  status: "pending" | "approved" | "joined" | "rejected" | "expired" | "generic";
  createdAt?: string;
  expiresAt: string;
  /** Present on invite-by-email responses. */
  emailSent?: boolean;
  emailMessage?: string;
}

export interface TreeCollaborator {
  id: string;
  treeId: string;
  userId: string;
  role: "owner" | "contributor";
  joinedAt: string;
}

export async function inviteCollaborator(
  treeId: string,
  email: string
): Promise<CollaborationInvitation> {
  const invite = await api.post<CollaborationInvitation>(
    `/trees/${encodeURIComponent(treeId)}/collaborators/invite`,
    { email }
  );

  // Cloud Spring hosts often block SMTP. Always try FE-only mail delivery when BE did not send.
  // Path is outside /api/* so USE_BACKEND rewrites never proxy it away.
  if (invite.emailSent === true) {
    return invite;
  }
  try {
    const res = await fetch("/_internal/send-invite-email", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email,
        code: invite.code,
        inviteId: invite.id,
        treeName: "Cây Gia Phả",
        registered: true,
      }),
    });
    const delivery = (await res.json().catch(() => ({}))) as {
      emailSent?: boolean;
      emailMessage?: string;
    };
    return {
      ...invite,
      emailSent: delivery.emailSent === true,
      emailMessage:
        delivery.emailMessage ||
        invite.emailMessage ||
        `Lời mời đã tạo (mã ${invite.code}).`,
    };
  } catch {
    return {
      ...invite,
      emailSent: false,
      emailMessage:
        invite.emailMessage ||
        `Lời mời đã tạo (mã ${invite.code}) nhưng không gửi được email từ frontend.`,
    };
  }
}

export function createInviteLink(
  treeId: string
): Promise<CollaborationInvitation> {
  return api.post<CollaborationInvitation>(
    `/trees/${encodeURIComponent(treeId)}/collaborators/invite-link`,
    {}
  );
}

export function getPendingInvitations(
  treeId: string
): Promise<CollaborationInvitation[]> {
  return api.get<CollaborationInvitation[]>(
    `/trees/${encodeURIComponent(treeId)}/collaborators/pending`
  );
}

export function approveInvitation(
  treeId: string,
  inviteId: string
): Promise<void> {
  return api.post<void>(
    `/trees/${encodeURIComponent(treeId)}/collaborators/approve/${encodeURIComponent(inviteId)}`,
    {}
  );
}

export function rejectInvitation(
  treeId: string,
  inviteId: string
): Promise<void> {
  return api.post<void>(
    `/trees/${encodeURIComponent(treeId)}/collaborators/reject/${encodeURIComponent(inviteId)}`,
    {}
  );
}

export function joinTreeGroup(
  code: string
): Promise<TreeCollaborator | CollaborationInvitation> {
  return api.post<TreeCollaborator | CollaborationInvitation>(
    `/trees/collaborators/join?code=${encodeURIComponent(code)}`,
    {}
  );
}

export function getCollaborators(
  treeId: string
): Promise<TreeCollaborator[]> {
  return api.get<TreeCollaborator[]>(
    `/trees/${encodeURIComponent(treeId)}/collaborators`
  );
}

export function getInvitationDetails(
  inviteId: string
): Promise<CollaborationInvitation> {
  return api.get<CollaborationInvitation>(
    `/trees/collaborators/invitations/${encodeURIComponent(inviteId)}`
  );
}

export function joinTreeWithLink(
  inviteId: string
): Promise<TreeCollaborator | CollaborationInvitation> {
  return api.post<TreeCollaborator | CollaborationInvitation>(
    `/trees/collaborators/join-link?inviteId=${encodeURIComponent(inviteId)}`,
    {}
  );
}
