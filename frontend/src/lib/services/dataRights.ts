import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import {
  claims,
  collaborationInvitations,
  inAppReminders,
  personPhotos,
  persons,
  relationships,
  sessions,
  treeCollaborators,
  trees,
  treeShareTokens,
  userConsents,
  users,
  verificationCodes,
} from "../db/schema";
import { ApiException } from "./errors";
import { personDeletionService, type PersonDeletionStrategy } from "./personDeletion";
import { deleteStoredPhotoObjects } from "./photo";
import { projectionCache } from "./kinship/address";

export interface DataExportResponse {
  person: typeof persons.$inferSelect;
  relationships: (typeof relationships.$inferSelect)[];
}

export interface SubjectNodeSummary {
  personId: string;
  treeId: string;
  displayName: string;
  treeName: string;
  claimedAt: Date;
}

export type NodeEraseStrategy = "delete" | "anonymize";
export type AccountLinkedNodeStrategy = "delete" | "anonymize";

export class DataRightsService {
  async listSubjectNodes(currentUserId: string): Promise<SubjectNodeSummary[]> {
    return db
      .select({
        personId: persons.id,
        treeId: persons.treeId,
        displayName: persons.displayName,
        treeName: trees.name,
        claimedAt: claims.claimedAt,
      })
      .from(claims)
      .innerJoin(persons, eq(claims.personId, persons.id))
      .innerJoin(trees, eq(persons.treeId, trees.id))
      .where(eq(claims.userId, currentUserId));
  }

  async exportNode(personId: string, currentUserId: string): Promise<DataExportResponse> {
    const person = await this.requireSubjectNode(personId, currentUserId);
    const incidentRelationships = await db
      .select()
      .from(relationships)
      .where(
        or(
          eq(relationships.sourceId, personId),
          eq(relationships.targetId, personId),
        ),
      );
    return { person, relationships: incidentRelationships };
  }

  async eraseNode(
    personId: string,
    strategy: NodeEraseStrategy,
    currentUserId: string,
    deletionStrategy: PersonDeletionStrategy = "preserve",
  ): Promise<void> {
    const person = await this.requireSubjectNode(personId, currentUserId);

    if (strategy === "delete") {
      await personDeletionService.execute(person.treeId, personId, deletionStrategy);
      return;
    }
    if (strategy !== "anonymize") {
      throw ApiException.validation("strategy", "Strategy must be 'delete' or 'anonymize'.");
    }

    const objectKeys = await db.transaction(async (tx) => {
      const linkedClaim = await tx
        .select({ id: claims.id })
        .from(claims)
        .where(and(eq(claims.personId, personId), eq(claims.userId, currentUserId)))
        .then((rows) => rows[0]);
      if (!linkedClaim) {
        throw ApiException.notAuthorized(
          "Only the person linked to this node may exercise data rights on it.",
        );
      }

      const photos = await tx
        .select({ objectKey: personPhotos.objectKey })
        .from(personPhotos)
        .where(eq(personPhotos.personId, personId));

      await tx.delete(inAppReminders).where(eq(inAppReminders.personId, personId));
      await tx.delete(verificationCodes).where(eq(verificationCodes.personId, personId));
      await tx.delete(personPhotos).where(eq(personPhotos.personId, personId));
      await tx.delete(claims).where(eq(claims.personId, personId));
      await tx
        .update(persons)
        .set({
          displayName: "(đã ẩn danh)",
          birthOrder: null,
          birthYear: null,
          phone: null,
          email: null,
          deathDay: null,
          deathMonth: null,
          deathYear: null,
          deathCalendar: null,
          deathLunarLeap: null,
          adoptionStatus: null,
          visName: "private",
          visBirthYear: "private",
          visPhoto: "private",
          visMarital: "private",
          visAdoption: "private",
          visDeath: "private",
        })
        .where(and(eq(persons.id, personId), eq(persons.treeId, person.treeId)));

      return photos.map((photo) => photo.objectKey);
    });

    await deleteStoredPhotoObjects(objectKeys, "data-rights-anonymize");
  }

  async deleteAccount(
    currentUserId: string,
    linkedNodeStrategy: AccountLinkedNodeStrategy = "anonymize",
  ): Promise<void> {
    if (linkedNodeStrategy !== "delete" && linkedNodeStrategy !== "anonymize") {
      throw ApiException.validation(
        "linkedNodeStrategy",
        "Linked-node strategy must be 'delete' or 'anonymize'.",
      );
    }

    const ownedTrees = await db
      .select({ id: trees.id })
      .from(trees)
      .where(eq(trees.ownerUserId, currentUserId));
    const ownedTreeIds = new Set(ownedTrees.map((tree) => tree.id));
    const linkedNodes = await db
      .select({ personId: persons.id, treeId: persons.treeId })
      .from(claims)
      .innerJoin(persons, eq(claims.personId, persons.id))
      .where(eq(claims.userId, currentUserId));

    for (const node of linkedNodes) {
      if (ownedTreeIds.has(node.treeId)) continue;
      await this.eraseNode(
        node.personId,
        linkedNodeStrategy,
        currentUserId,
        "preserve",
      );
    }

    const treeIds = [...ownedTreeIds];
    const objectKeys = await db.transaction(async (tx) => {
      let ownedPersonIds: string[] = [];
      let photoKeys: string[] = [];
      if (treeIds.length > 0) {
        const ownedPersons = await tx
          .select({ id: persons.id })
          .from(persons)
          .where(inArray(persons.treeId, treeIds));
        ownedPersonIds = ownedPersons.map((person) => person.id);

        if (ownedPersonIds.length > 0) {
          const photos = await tx
            .select({ objectKey: personPhotos.objectKey })
            .from(personPhotos)
            .where(inArray(personPhotos.personId, ownedPersonIds));
          photoKeys = photos.map((photo) => photo.objectKey);
          await tx.delete(inAppReminders).where(inArray(inAppReminders.personId, ownedPersonIds));
          await tx.delete(verificationCodes).where(inArray(verificationCodes.personId, ownedPersonIds));
          await tx.delete(claims).where(inArray(claims.personId, ownedPersonIds));
          await tx.delete(personPhotos).where(inArray(personPhotos.personId, ownedPersonIds));
        }

        await tx.delete(relationships).where(inArray(relationships.treeId, treeIds));
        await tx.delete(persons).where(inArray(persons.treeId, treeIds));
        await tx.delete(treeShareTokens).where(inArray(treeShareTokens.treeId, treeIds));
        await tx
          .delete(collaborationInvitations)
          .where(inArray(collaborationInvitations.treeId, treeIds));
        await tx.delete(treeCollaborators).where(inArray(treeCollaborators.treeId, treeIds));
        await tx.delete(trees).where(inArray(trees.id, treeIds));
      }

      await tx
        .delete(collaborationInvitations)
        .where(
          or(
            eq(collaborationInvitations.inviterUserId, currentUserId),
            eq(collaborationInvitations.requesterUserId, currentUserId),
          ),
        );
      await tx.delete(treeCollaborators).where(eq(treeCollaborators.userId, currentUserId));
      await tx.delete(inAppReminders).where(eq(inAppReminders.userId, currentUserId));
      await tx.delete(claims).where(eq(claims.userId, currentUserId));
      await tx.delete(sessions).where(eq(sessions.userId, currentUserId));
      await tx.delete(userConsents).where(eq(userConsents.userId, currentUserId));
      await tx.delete(verificationCodes).where(eq(verificationCodes.userId, currentUserId));
      await tx.delete(users).where(eq(users.id, currentUserId));
      return photoKeys;
    });

    treeIds.forEach((treeId) => projectionCache.evict(treeId));
    await deleteStoredPhotoObjects(objectKeys, "account-deletion");
  }

  private async requireSubjectNode(personId: string, currentUserId: string) {
    const person = await db
      .select()
      .from(persons)
      .innerJoin(claims, eq(claims.personId, persons.id))
      .where(and(eq(persons.id, personId), eq(claims.userId, currentUserId)))
      .then((rows) => rows[0]?.persons);

    if (!person) {
      throw ApiException.nodeNotAccessible("The target node is not accessible.");
    }
    return person;
  }
}

export const dataRightsService = new DataRightsService();
