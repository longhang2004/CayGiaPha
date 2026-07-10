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

async function deliverInviteEmailFromFrontend(input: {
  email: string;
  code: string;
  inviteId: string;
  treeName?: string;
}): Promise<{ emailSent: boolean; emailMessage: string }> {
  // Must NOT use a path under /api/* (proxied to Spring when USE_BACKEND=true).
  // Must NOT use a folder starting with "_" (Next.js private folder — not routable).
  const res = await fetch("/internal/send-invite-email", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      email: input.email,
      code: input.code,
      inviteId: input.inviteId,
      treeName: input.treeName || "Cây Gia Phả",
      registered: true,
    }),
  });

  let delivery: { emailSent?: boolean; emailMessage?: string; error?: { message?: string } } = {};
  try {
    delivery = await res.json();
  } catch {
    // non-JSON
  }

  if (!res.ok) {
    return {
      emailSent: false,
      emailMessage: `Gửi email từ frontend thất bại (HTTP ${res.status}). Kiểm tra EMAIL_* trên Vercel. Mã: ${input.code}`,
    };
  }

  return {
    emailSent: delivery.emailSent === true,
    emailMessage:
      delivery.emailMessage ||
      (delivery.emailSent
        ? `Đã gửi email tới ${input.email}. Mã: ${input.code}`
        : `Không gửi được email từ frontend. Kiểm tra EMAIL_ENABLED/EMAIL_HOST/EMAIL_USER/EMAIL_PASS trên Vercel. Mã: ${input.code}`),
  };
}

export async function inviteCollaborator(
  treeId: string,
  email: string
): Promise<CollaborationInvitation> {
  const invite = await api.post<CollaborationInvitation>(
    `/trees/${encodeURIComponent(treeId)}/collaborators/invite`,
    { email }
  );

  // Always deliver from the Next.js host when BE did not send.
  // Never surface BE SMTP errors — those are expected on cloud hosts.
  if (invite.emailSent === true && invite.emailMessage) {
    return invite;
  }

  try {
    // Only inviteId is authoritative; code is included so the email body can show it
    // (GET invitation intentionally omits code). Endpoint re-validates session + ownership.
    const delivery = await deliverInviteEmailFromFrontend({
      email: invite.email || email,
      code: invite.code,
      inviteId: invite.id,
    });
    return {
      ...invite,
      emailSent: delivery.emailSent,
      emailMessage: delivery.emailMessage,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return {
      ...invite,
      emailSent: false,
      emailMessage: `Lời mời đã tạo (mã ${invite.code}) nhưng frontend không gọi được /_internal/send-invite-email: ${msg}`,
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
