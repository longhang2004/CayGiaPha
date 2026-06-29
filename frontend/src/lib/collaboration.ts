/**
 * Frontend API client helpers for co-building collaboration and invitations.
 */

import { api } from "./apiClient";

export interface CollaborationInvitation {
  id: string;
  treeId: string;
  inviterUserId: string;
  email: string;
  code: string;
  status: "pending" | "sent" | "joined" | "rejected" | "expired";
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
): Promise<TreeCollaborator> {
  return api.post<TreeCollaborator>(
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
