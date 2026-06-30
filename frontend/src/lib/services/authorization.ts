import { db } from "../db";
import { trees, claims, treeShareTokens, userConsents, legalDocuments, persons, users, treeCollaborators } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ApiException } from "./errors";
import { consentService } from "./consent";
import { cookies } from "next/headers";
import { sessionService } from "./auth";
import crypto from "crypto";

export type Role = "OWNER" | "LINKED_CLAIMED_USER" | "NEITHER";

export interface AuthContext {
  userId: string | null;
  ownedTreeId: string | null;
  isAuthenticated: boolean;
}

export async function getAuthContext(): Promise<AuthContext> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("SESSION")?.value;
  if (!sessionToken) {
    return { userId: null, ownedTreeId: null, isAuthenticated: false };
  }

  const session = await sessionService.resolve(sessionToken);
  if (!session) {
    return { userId: null, ownedTreeId: null, isAuthenticated: false };
  }

  const userExists = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, session.userId))
    .then((rows) => rows.length > 0);

  if (!userExists) {
    return { userId: null, ownedTreeId: null, isAuthenticated: false };
  }

  const ownedTree = await db
    .select({ id: trees.id })
    .from(trees)
    .where(eq(trees.ownerUserId, session.userId))
    .then((rows) => rows[0]);

  return {
    userId: session.userId,
    ownedTreeId: ownedTree ? ownedTree.id : null,
    isAuthenticated: true,
  };
}


export class AuthorizationService {
  async classify(
    currentUserId: string | null,
    ownedTreeId: string | null,
    targetTreeId: string | null,
    targetPersonId?: string | null
  ): Promise<Role> {
    if (!currentUserId) {
      return "NEITHER";
    }

    let treeId = targetTreeId;
    if (!treeId && targetPersonId) {
      const p = await db
        .select({ treeId: persons.treeId })
        .from(persons)
        .where(eq(persons.id, targetPersonId))
        .then((rows) => rows[0]);
      if (p) {
        treeId = p.treeId;
      }
    }

    if (treeId) {
      // Check if user is the direct owner of the tree
      const isOwner = await db
        .select({ id: trees.id })
        .from(trees)
        .where(and(eq(trees.id, treeId), eq(trees.ownerUserId, currentUserId)))
        .then((rows) => rows.length > 0);
      if (isOwner) {
        return "OWNER";
      }

      // Check if user is a collaborator with write access
      const isCollab = await db
        .select({ id: treeCollaborators.id })
        .from(treeCollaborators)
        .where(and(eq(treeCollaborators.treeId, treeId), eq(treeCollaborators.userId, currentUserId)))
        .then((rows) => rows.length > 0);
      if (isCollab) {
        return "OWNER";
      }
    }

    // LINKED_CLAIMED_USER: check if the target person is claimed by this user
    if (targetPersonId) {
      const isLinked = await db
        .select()
        .from(claims)
        .where(
          and(
            eq(claims.personId, targetPersonId),
            eq(claims.userId, currentUserId)
          )
        )
        .then((rows) => rows.length > 0);

      if (isLinked) {
        return "LINKED_CLAIMED_USER";
      }
    }

    return "NEITHER";
  }

  async requireMutationPermitted(
    currentUserId: string | null,
    ownedTreeId: string | null,
    targetTreeId: string,
    targetPersonId?: string | null
  ): Promise<void> {
    const role = await this.classify(currentUserId, ownedTreeId, targetTreeId, targetPersonId);
    if (role === "NEITHER") {
      throw ApiException.notAuthorized("You are not authorized to modify this tree's contents.");
    }
    await this.requireCurrentConsent(currentUserId);
  }

  async requireOwner(
    currentUserId: string | null,
    ownedTreeId: string | null,
    targetTreeId: string
  ): Promise<void> {
    const role = await this.classify(currentUserId, ownedTreeId, targetTreeId, null);
    if (role !== "OWNER") {
      throw ApiException.notAuthorized("Only the tree owner may perform this operation.");
    }
    await this.requireCurrentConsent(currentUserId);
  }

  private async requireCurrentConsent(userId: string | null): Promise<void> {
    if (userId && (await consentService.needsReacceptance(userId))) {
      throw ApiException.consentRequired(
        "Please re-accept the updated Terms of Service and Privacy Policy to continue."
      );
    }
  }

  async hasReadAccess(
    currentUserId: string | null,
    ownedTreeId: string | null,
    targetTreeId: string,
    shareToken?: string | null
  ): Promise<boolean> {
    if (!currentUserId || !targetTreeId) {
      return false;
    }

    // Owner check
    const isOwner = await db
      .select({ id: trees.id })
      .from(trees)
      .where(and(eq(trees.id, targetTreeId), eq(trees.ownerUserId, currentUserId)))
      .then((rows) => rows.length > 0);
    if (isOwner) {
      return true;
    }

    // Collaborator check
    const isCollab = await db
      .select({ id: treeCollaborators.id })
      .from(treeCollaborators)
      .where(and(eq(treeCollaborators.treeId, targetTreeId), eq(treeCollaborators.userId, currentUserId)))
      .then((rows) => rows.length > 0);
    if (isCollab) {
      return true;
    }

    // Linked family member has access

    const isLinked = await this.isUserLinkedToTree(targetTreeId, currentUserId);
    if (isLinked) {
      return true;
    }

    const tree = await db
      .select()
      .from(trees)
      .where(eq(trees.id, targetTreeId))
      .then((rows) => rows[0]);

    if (!tree) {
      return false;
    }

    if (tree.sharing === "private") {
      return false;
    }

    if (tree.sharing === "public") {
      return true;
    }

    // 'link' sharing: check if token is valid
    if (tree.sharing === "link" && shareToken) {
      const tokenHash = this.hashToken(shareToken);
      const validToken = await db
        .select()
        .from(treeShareTokens)
        .where(
          and(
            eq(treeShareTokens.tokenHash, tokenHash),
            eq(treeShareTokens.treeId, targetTreeId),
            // not revoked
            // revokedAt is null
          )
        )
        .then((rows) => rows.filter(r => !r.revokedAt)[0]);

      if (validToken) {
        return true;
      }
    }

    return false;
  }

  async requireReadAccess(
    currentUserId: string | null,
    ownedTreeId: string | null,
    targetTreeId: string,
    shareToken?: string | null
  ): Promise<void> {
    const hasAccess = await this.hasReadAccess(currentUserId, ownedTreeId, targetTreeId, shareToken);
    if (!hasAccess) {
      throw ApiException.notAuthorized("You are not authorized to view this tree.");
    }
  }

  private async isUserLinkedToTree(treeId: string, userId: string): Promise<boolean> {
    const rows = await db
      .select({ id: claims.id })
      .from(claims)
      .innerJoin(persons, eq(claims.personId, persons.id))
      .where(and(eq(persons.treeId, treeId), eq(claims.userId, userId)));
    return rows.length > 0;
  }

  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

export const authorizationService = new AuthorizationService();
