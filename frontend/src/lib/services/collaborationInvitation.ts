import { createHash, randomUUID } from "crypto";
import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import { collaborationInvitations, treeCollaborators, users } from "../db/schema";
import { ApiException } from "./errors";

type InvitationRow = typeof collaborationInvitations.$inferSelect;
export type InvitationType = "generic" | "email";

export function normalizeInvitationEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

export function normalizeInvitationCode(code: string | null | undefined): string {
  return (code || "").trim().toLowerCase();
}

export function hashInvitationCode(code: string): string {
  return `sha256:${createHash("sha256")
    .update(normalizeInvitationCode(code), "utf8")
    .digest("base64url")}`;
}

export function invitationType(invite: Pick<InvitationRow, "email">): InvitationType {
  return invite.email ? "email" : "generic";
}

export function requireUsableInvitation(
  invite: Pick<InvitationRow, "status" | "expiresAt">,
): void {
  if (
    new Date(invite.expiresAt).getTime() < Date.now() ||
    !["generic", "approved", "joined"].includes(invite.status)
  ) {
    throw ApiException.validation("inviteId", "Lời mời không hợp lệ");
  }
}

export function existingRequestOutcome(status: string): "pending" | "joined" {
  if (status === "pending" || status === "joined") return status;
  throw ApiException.validation("inviteId", "Lời mời không hợp lệ");
}

async function requireUser(userId: string) {
  const user = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .then((rows) => rows[0]);
  if (!user) throw ApiException.validation("inviteId", "Lời mời không hợp lệ");
  return user;
}

async function requireInvite(inviteId: string): Promise<InvitationRow> {
  const invite = await db
    .select()
    .from(collaborationInvitations)
    .where(eq(collaborationInvitations.id, inviteId))
    .then((rows) => rows[0]);
  if (!invite) throw ApiException.validation("inviteId", "Lời mời không hợp lệ");
  return invite;
}

function requireMatchingEmail(invite: InvitationRow, email: string | null) {
  if (invite.email && normalizeInvitationEmail(invite.email) !== normalizeInvitationEmail(email)) {
    throw ApiException.validation("inviteId", "Lời mời không hợp lệ");
  }
}

export interface SafeInvitationView {
  id: string;
  treeId: string;
  status: string;
  expiresAt: Date;
  invitationType: InvitationType;
}

export async function getSafeInvitation(inviteId: string, userId: string): Promise<SafeInvitationView> {
  const [invite, user] = await Promise.all([requireInvite(inviteId), requireUser(userId)]);
  requireUsableInvitation(invite);
  requireMatchingEmail(invite, user.email);

  let status = invite.status;
  if (invite.status === "generic") {
    const request = await db
      .select({ status: collaborationInvitations.status })
      .from(collaborationInvitations)
      .where(and(
        eq(collaborationInvitations.sourceInvitationId, invite.id),
        eq(collaborationInvitations.requesterUserId, userId),
      ))
      .then((rows) => rows[0]);
    if (request) status = request.status;
  }

  return { id: invite.id, treeId: invite.treeId, status, expiresAt: invite.expiresAt, invitationType: invitationType(invite) };
}

async function ensureCollaborator(treeId: string, userId: string) {
  const [created] = await db
    .insert(treeCollaborators)
    .values({ id: randomUUID(), treeId, userId, role: "contributor" })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  return db.select().from(treeCollaborators).where(and(
    eq(treeCollaborators.treeId, treeId),
    eq(treeCollaborators.userId, userId),
  )).then((rows) => rows[0]);
}

async function createPendingRequest(invite: InvitationRow, userId: string, email: string | null) {
  await db.insert(collaborationInvitations).values({
    id: randomUUID(),
    treeId: invite.treeId,
    inviterUserId: invite.inviterUserId,
    requesterUserId: userId,
    sourceInvitationId: invite.id,
    email: email || null,
    code: hashInvitationCode(randomUUID().replace(/-/g, "")),
    status: "pending",
    expiresAt: invite.expiresAt,
  }).onConflictDoNothing();

  return db.select().from(collaborationInvitations).where(and(
    eq(collaborationInvitations.sourceInvitationId, invite.id),
    eq(collaborationInvitations.requesterUserId, userId),
  )).then((rows) => rows[0]);
}

export async function acceptInvitation(inviteId: string, userId: string) {
  const [invite, user] = await Promise.all([requireInvite(inviteId), requireUser(userId)]);
  requireUsableInvitation(invite);
  requireMatchingEmail(invite, user.email);

  if (invite.status === "generic") {
    const existing = await db.select().from(collaborationInvitations).where(and(
      eq(collaborationInvitations.sourceInvitationId, invite.id),
      eq(collaborationInvitations.requesterUserId, userId),
    )).then((rows) => rows[0]);
    if (existing) {
      const outcome = existingRequestOutcome(existing.status);
      if (outcome === "joined") {
        return { kind: "joined" as const, value: await ensureCollaborator(invite.treeId, userId) };
      }
      return { kind: "pending" as const, value: existing };
    }
    return { kind: "pending" as const, value: await createPendingRequest(invite, userId, user.email) };
  }

  const collaborator = await ensureCollaborator(invite.treeId, userId);
  if (invite.status !== "joined") {
    await db.update(collaborationInvitations).set({ status: "joined" }).where(eq(collaborationInvitations.id, invite.id));
  }
  return { kind: "joined" as const, value: collaborator };
}

export async function acceptInvitationCode(code: string, userId: string) {
  const normalized = normalizeInvitationCode(code);
  if (!normalized) throw ApiException.validation("code", "Mã mời không hợp lệ");
  const invite = await db.select({ id: collaborationInvitations.id })
    .from(collaborationInvitations)
    .where(or(
      eq(collaborationInvitations.code, hashInvitationCode(normalized)),
      eq(collaborationInvitations.code, normalized),
    ))
    .then((rows) => rows[0]);
  if (!invite) throw ApiException.validation("code", "Mã mời không hợp lệ");
  return acceptInvitation(invite.id, userId);
}

export async function approvePendingInvitation(treeId: string, inviteId: string) {
  const invite = await requireInvite(inviteId);
  if (invite.treeId !== treeId || !invite.requesterUserId || !["pending", "joined"].includes(invite.status)) {
    throw ApiException.validation("inviteId", "Lời mời không hợp lệ");
  }
  requireUsableInvitation({ ...invite, status: invite.status === "joined" ? "joined" : "approved" });
  const collaborator = await ensureCollaborator(treeId, invite.requesterUserId);
  await db.update(collaborationInvitations).set({ status: "joined" }).where(eq(collaborationInvitations.id, invite.id));
  return collaborator;
}
