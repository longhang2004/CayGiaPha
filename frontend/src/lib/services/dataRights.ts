import { db } from "../db";
import { persons, relationships, claims, trees, treeShareTokens, sessions, userConsents, verificationCodes, users } from "../db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { ApiException } from "./errors";
import { personDeletionService } from "./personDeletion";

export interface DataExportResponse {
  person: typeof persons.$inferSelect;
  relationships: (typeof relationships.$inferSelect)[];
}

export class DataRightsService {
  async exportNode(personId: string, currentUserId: string): Promise<DataExportResponse> {
    const person = await this.requireSubjectNode(personId, currentUserId);
    const rels = await db
      .select()
      .from(relationships)
      .where(
        or(
          eq(relationships.sourceId, personId),
          eq(relationships.targetId, personId)
        )
      );

    return { person, relationships: rels };
  }

  async eraseNode(personId: string, strategy: "delete" | "anonymize", currentUserId: string): Promise<void> {
    const person = await this.requireSubjectNode(personId, currentUserId);

    if (strategy === "delete") {
      await personDeletionService.execute(person.treeId, personId, "preserve");
    } else if (strategy === "anonymize") {
      await db
        .update(persons)
        .set({
          displayName: "(đã ẩn)",
          birthOrder: null,
          birthYear: null,
          adoptionStatus: null,
        })
        .where(eq(persons.id, personId));

      // Detach claim
      await db.delete(claims).where(eq(claims.personId, personId));
    } else {
      throw ApiException.validation("strategy", "Strategy must be 'delete' or 'anonymize'.");
    }
  }

  async deleteAccount(currentUserId: string): Promise<void> {
    const ownedTree = await db
      .select()
      .from(trees)
      .where(eq(trees.ownerUserId, currentUserId))
      .then((rows) => rows[0]);

    if (ownedTree) {
      await this.cascadeDeleteTree(ownedTree.id);
    }

    // Remove user claims, sessions, consents, verification codes, and user
    await db.delete(claims).where(eq(claims.userId, currentUserId));
    await db.delete(sessions).where(eq(sessions.userId, currentUserId));
    await db.delete(userConsents).where(eq(userConsents.userId, currentUserId));
    await db.delete(verificationCodes).where(eq(verificationCodes.userId, currentUserId));
    await db.delete(users).where(eq(users.id, currentUserId));
  }

  private async cascadeDeleteTree(treeId: string) {
    await db.delete(treeShareTokens).where(eq(treeShareTokens.treeId, treeId));
    await db.delete(relationships).where(eq(relationships.treeId, treeId));

    const treePersons = await db
      .select()
      .from(persons)
      .where(eq(persons.treeId, treeId));

    const personIds = treePersons.map((p) => p.id);

    if (personIds.length > 0) {
      await db.delete(claims).where(inArray(claims.personId, personIds));
      await db.delete(verificationCodes).where(inArray(verificationCodes.personId, personIds));
    }

    await db.delete(persons).where(eq(persons.treeId, treeId));
    await db.delete(trees).where(eq(trees.id, treeId));
  }

  private async requireSubjectNode(personId: string, currentUserId: string) {
    const person = await db
      .select()
      .from(persons)
      .where(eq(persons.id, personId))
      .then((rows) => rows[0]);

    if (!person) {
      throw ApiException.nodeNotAccessible("The target node is not accessible.");
    }

    // Check if the user is linked to this node
    const isLinked = await db
      .select()
      .from(claims)
      .where(and(eq(claims.personId, personId), eq(claims.userId, currentUserId)))
      .then((rows) => rows.length > 0);

    if (!isLinked) {
      throw ApiException.notAuthorized(
        "Only the person linked to this node may exercise data rights on it."
      );
    }

    return person;
  }
}

export const dataRightsService = new DataRightsService();
