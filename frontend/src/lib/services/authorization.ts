import { db } from "../db";
import { trees, claims, treeShareTokens, persons, users, treeCollaborators } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { ApiException } from "./errors";
import { consentService } from "./consent";
import { cookies } from "next/headers";
import { sessionService } from "./auth";
import crypto from "crypto";

export type Role = "OWNER" | "CONTRIBUTOR" | "LINKED" | "READER" | "NONE";

export interface Capabilities {
  editContent: boolean;
  editPhotos: boolean;
  editVisibility: boolean;
  manageClaim: boolean;
  manageTree: boolean;
  manageCollaboration: boolean;
}

const NO_CAPABILITIES: Capabilities = {
  editContent: false,
  editPhotos: false,
  editVisibility: false,
  manageClaim: false,
  manageTree: false,
  manageCollaboration: false,
};

export function capabilitiesFor(
  role: Role,
  options: { personScoped?: boolean } = {},
): Capabilities {
  if (role === "OWNER") {
    return {
      editContent: true,
      editPhotos: true,
      editVisibility: true,
      manageClaim: true,
      manageTree: true,
      manageCollaboration: true,
    };
  }
  if (role === "CONTRIBUTOR") {
    return {
      ...NO_CAPABILITIES,
      editContent: true,
      editPhotos: true,
    };
  }
  if (role === "LINKED" && options.personScoped) {
    return {
      ...NO_CAPABILITIES,
      editContent: true,
      editPhotos: true,
      editVisibility: true,
    };
  }
  return { ...NO_CAPABILITIES };
}

export interface AuthContext {
  userId: string | null;
  isAuthenticated: boolean;
  role: "user" | "admin" | null;
}

export async function getAuthContext(): Promise<AuthContext> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("SESSION")?.value;
  if (!sessionToken) {
    return { userId: null, isAuthenticated: false, role: null };
  }

  const session = await sessionService.resolve(sessionToken);
  if (!session) {
    return { userId: null, isAuthenticated: false, role: null };
  }

  const user = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, session.userId))
    .then((rows) => rows[0]);

  if (!user) {
    return { userId: null, isAuthenticated: false, role: null };
  }

  return {
    userId: session.userId,
    isAuthenticated: true,
    role: user.role === "admin" ? "admin" : "user",
  };
}


export class AuthorizationService {
  async classify(
    currentUserId: string | null,
    targetTreeId: string,
    targetPersonId?: string | null,
    shareToken?: string | null,
  ): Promise<Role> {
    if (!currentUserId) {
      return "NONE";
    }

    const isOwner = await db
      .select({ id: trees.id })
      .from(trees)
      .where(and(eq(trees.id, targetTreeId), eq(trees.ownerUserId, currentUserId)))
      .then((rows) => rows.length > 0);
    if (isOwner) {
      return "OWNER";
    }

    const isContributor = await db
      .select({ id: treeCollaborators.id })
      .from(treeCollaborators)
      .where(and(eq(treeCollaborators.treeId, targetTreeId), eq(treeCollaborators.userId, currentUserId)))
      .then((rows) => rows.length > 0);
    if (isContributor) {
      return "CONTRIBUTOR";
    }

    if (targetPersonId) {
      const isLinked = await db
        .select({ id: claims.id })
        .from(claims)
        .where(
          and(
            eq(claims.personId, targetPersonId),
            eq(claims.userId, currentUserId)
          )
        )
        .then((rows) => rows.length > 0);

      if (isLinked) {
        return "LINKED";
      }
    }

    if (await this.isUserLinkedToTree(targetTreeId, currentUserId)) {
      return targetPersonId ? "READER" : "LINKED";
    }

    const tree = await db
      .select({ sharing: trees.sharing })
      .from(trees)
      .where(eq(trees.id, targetTreeId))
      .then((rows) => rows[0]);
    if (!tree) {
      return "NONE";
    }
    if (tree.sharing === "public") {
      return "READER";
    }
    if (tree.sharing === "link" && shareToken) {
      const tokenHash = this.hashToken(shareToken);
      const validToken = await db
        .select({ id: treeShareTokens.id, revokedAt: treeShareTokens.revokedAt })
        .from(treeShareTokens)
        .where(and(eq(treeShareTokens.tokenHash, tokenHash), eq(treeShareTokens.treeId, targetTreeId)))
        .then((rows) => rows.find((row) => !row.revokedAt));
      if (validToken) {
        return "READER";
      }
    }
    return "NONE";
  }

  async requireContentEditor(
    currentUserId: string | null,
    targetTreeId: string,
    targetPersonId?: string | null
  ): Promise<void> {
    const role = await this.classify(currentUserId, targetTreeId, targetPersonId);
    const permitted = role === "OWNER" || role === "CONTRIBUTOR" || (role === "LINKED" && !!targetPersonId);
    if (!permitted) {
      throw ApiException.notAuthorized("You are not authorized to modify this tree's contents.");
    }
    await this.requireCurrentConsent(currentUserId);
  }

  async requireMutationPermitted(
    currentUserId: string | null,
    targetTreeId: string,
    targetPersonId?: string | null,
  ): Promise<void> {
    await this.requireContentEditor(currentUserId, targetTreeId, targetPersonId);
  }

  async requireVisibilityEditor(
    currentUserId: string | null,
    targetTreeId: string,
    targetPersonId: string,
  ): Promise<void> {
    const role = await this.classify(currentUserId, targetTreeId, targetPersonId);
    if (role !== "OWNER" && role !== "LINKED") {
      throw ApiException.notAuthorized("Only the tree owner or linked person may change visibility.");
    }
    await this.requireCurrentConsent(currentUserId);
  }

  async requireOwner(
    currentUserId: string | null,
    targetTreeId: string
  ): Promise<void> {
    const role = await this.classify(currentUserId, targetTreeId, null);
    if (role !== "OWNER") {
      throw ApiException.notAuthorized("Only the tree owner may perform this operation.");
    }
    await this.requireCurrentConsent(currentUserId);
  }

  async requireAdmin(currentUserId: string | null): Promise<void> {
    if (!currentUserId) {
      throw ApiException.notAuthorized("Only administrators may perform this operation.");
    }
    const user = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, currentUserId))
      .then((rows) => rows[0]);

    if (user?.role !== "admin") {
      throw ApiException.notAuthorized("Only administrators may perform this operation.");
    }
  }

  async requireAuthenticatedAccountMutation(currentUserId: string | null): Promise<void> {
    if (!currentUserId) {
      throw ApiException.notAuthorized("You must be signed in to update this account.");
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
    targetTreeId: string,
    shareToken?: string | null
  ): Promise<boolean> {
    return (await this.classify(currentUserId, targetTreeId, null, shareToken)) !== "NONE";
  }

  async requireReadAccess(
    currentUserId: string | null,
    targetTreeId: string,
    shareToken?: string | null
  ): Promise<void> {
    const hasAccess = await this.hasReadAccess(currentUserId, targetTreeId, shareToken);
    if (!hasAccess) {
      throw ApiException.notAuthorized("You are not authorized to view this tree.");
    }
  }

  async requireCollaborationRosterAccess(
    currentUserId: string | null,
    targetTreeId: string,
  ): Promise<void> {
    if (!currentUserId) {
      throw ApiException.notAuthorized("You are not authorized to view this collaboration roster.");
    }

    const owned = await db
      .select({ id: trees.id })
      .from(trees)
      .where(and(eq(trees.id, targetTreeId), eq(trees.ownerUserId, currentUserId)))
      .then((rows) => rows[0]);

    if (!owned) {
      throw ApiException.notAuthorized("You are not authorized to view this collaboration roster.");
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
