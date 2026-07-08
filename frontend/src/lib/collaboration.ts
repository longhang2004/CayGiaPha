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
  status: "pending" | "approved" | "joined" | "rejected" | "expired";
  createdAt: string;
  expiresAt: string;
}

export interface TreeCollaborator {
  id: string;
  treeId: string;
  userId: string;
  role: "owner" | "contributor";
  joinedAt: string;
}

export function inviteCollaborator(
  treeId: string,
  email: string
): Promise<CollaborationInvitation> {
  return api.post<CollaborationInvitation>(
    `/trees/${encodeURIComponent(treeId)}/collaborators/invite`,
    { email }
  );
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
