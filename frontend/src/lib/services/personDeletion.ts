import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import {
  claims,
  inAppReminders,
  personPhotos,
  persons,
  relationships,
  verificationCodes,
} from "../db/schema";
import { ApiException } from "./errors";
import { projectionCache, kinshipAddressService } from "./kinship/address";
import { KinshipGraphProjection, type Relationship } from "./kinship/projection";
import { deleteStoredPhotoObjects } from "./photo";

export type PersonDeletionStrategy = "cascade" | "preserve";

export function planCascadeRemoval(
  edges: Pick<Relationship, "sourceId" | "targetId">[],
  personId: string,
): string[] {
  const degree = new Map<string, number>();
  const neighbors = new Map<string, string[]>();

  for (const edge of edges) {
    degree.set(edge.sourceId, (degree.get(edge.sourceId) ?? 0) + 1);
    degree.set(edge.targetId, (degree.get(edge.targetId) ?? 0) + 1);
    neighbors.set(edge.sourceId, [...(neighbors.get(edge.sourceId) ?? []), edge.targetId]);
    neighbors.set(edge.targetId, [...(neighbors.get(edge.targetId) ?? []), edge.sourceId]);
  }

  const removed = new Set([personId]);
  const worklist = [personId];
  while (worklist.length > 0) {
    const current = worklist.shift()!;
    for (const neighbor of neighbors.get(current) ?? []) {
      if (removed.has(neighbor)) continue;
      const remaining = (degree.get(neighbor) ?? 0) - 1;
      degree.set(neighbor, remaining);
      if (remaining <= 0) {
        removed.add(neighbor);
        worklist.push(neighbor);
      }
    }
  }
  return [...removed];
}

function mapRelationship(edge: typeof relationships.$inferSelect): Relationship {
  return {
    id: edge.id,
    treeId: edge.treeId,
    type: edge.type,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    maritalStatus: edge.maritalStatus,
    socialType: edge.socialType,
    assertedLabel: edge.assertedLabel,
    derivationState: edge.derivationState,
  };
}

export class PersonDeletionService {
  async beginDeletion(treeId: string, personId: string) {
    await this.requirePerson(treeId, personId);
    return {
      personId,
      strategies: ["cascade", "preserve"] as PersonDeletionStrategy[],
    };
  }

  async execute(
    treeId: string,
    personId: string,
    strategy: string,
  ): Promise<void> {
    if (strategy !== "cascade" && strategy !== "preserve") {
      throw ApiException.validation(
        "strategy",
        "Deletion strategy must be one of cascade or preserve.",
      );
    }
    const person = await this.requirePerson(treeId, personId);
    const edges = await db
      .select()
      .from(relationships)
      .where(eq(relationships.treeId, treeId));

    if (strategy === "cascade") {
      await this.deleteCascade(person.treeId, personId, edges);
    } else {
      await this.deletePreserve(person.treeId, personId, edges);
    }
  }

  private async deleteCascade(
    treeId: string,
    personId: string,
    edges: (typeof relationships.$inferSelect)[],
  ): Promise<void> {
    const removedIds = planCascadeRemoval(edges.map(mapRelationship), personId);
    const objectKeys = await db.transaction(async (tx) => {
      const stillExists = await tx
        .select({ id: persons.id })
        .from(persons)
        .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)))
        .then((rows) => rows[0]);
      if (!stillExists) {
        throw ApiException.nodeNotAccessible("The target node is not accessible.");
      }

      const photos = await tx
        .select({ objectKey: personPhotos.objectKey })
        .from(personPhotos)
        .where(inArray(personPhotos.personId, removedIds));

      await tx.delete(inAppReminders).where(inArray(inAppReminders.personId, removedIds));
      await tx.delete(verificationCodes).where(inArray(verificationCodes.personId, removedIds));
      await tx.delete(claims).where(inArray(claims.personId, removedIds));
      await tx.delete(personPhotos).where(inArray(personPhotos.personId, removedIds));
      await tx
        .delete(relationships)
        .where(
          and(
            eq(relationships.treeId, treeId),
            or(
              inArray(relationships.sourceId, removedIds),
              inArray(relationships.targetId, removedIds),
            ),
          ),
        );
      await tx
        .delete(persons)
        .where(and(eq(persons.treeId, treeId), inArray(persons.id, removedIds)));
      return photos.map((photo) => photo.objectKey);
    });

    projectionCache.evict(treeId);
    await deleteStoredPhotoObjects(objectKeys, "person-deletion");
  }

  private async deletePreserve(
    treeId: string,
    personId: string,
    edges: (typeof relationships.$inferSelect)[],
  ): Promise<void> {
    const mappedEdges = edges.map(mapRelationship);
    const preProjection = KinshipGraphProjection.fromEdges(treeId, mappedEdges);
    const derivedNeighbors = [...new Set(
      preProjection.stepsFrom(personId).map((step) => step.to).filter((id) => id !== personId),
    )];

    const assertions: Array<{ sourceId: string; targetId: string; assertedLabel: string }> = [];
    const survivingEdges = mappedEdges.filter(
      (edge) => edge.sourceId !== personId && edge.targetId !== personId,
    );
    const postProjection = KinshipGraphProjection.fromEdges(treeId, survivingEdges);

    for (let i = 0; i < derivedNeighbors.length; i += 1) {
      for (let j = i + 1; j < derivedNeighbors.length; j += 1) {
        const sourceId = derivedNeighbors[i];
        const targetId = derivedNeighbors[j];
        if (this.derivedConnected(postProjection, sourceId, targetId)) continue;
        const resolution = await kinshipAddressService.resolveAddress(treeId, sourceId, targetId);
        if (resolution.status === "RESOLVED" && resolution.term) {
          assertions.push({ sourceId, targetId, assertedLabel: resolution.term });
        }
      }
    }

    const objectKeys = await db.transaction(async (tx) => {
      const stillExists = await tx
        .select({ id: persons.id })
        .from(persons)
        .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)))
        .then((rows) => rows[0]);
      if (!stillExists) {
        throw ApiException.nodeNotAccessible("The target node is not accessible.");
      }

      const photos = await tx
        .select({ objectKey: personPhotos.objectKey })
        .from(personPhotos)
        .where(eq(personPhotos.personId, personId));
      await tx.delete(inAppReminders).where(eq(inAppReminders.personId, personId));
      await tx.delete(verificationCodes).where(eq(verificationCodes.personId, personId));
      await tx.delete(claims).where(eq(claims.personId, personId));
      await tx.delete(personPhotos).where(eq(personPhotos.personId, personId));
      await tx
        .delete(relationships)
        .where(
          and(
            eq(relationships.treeId, treeId),
            or(eq(relationships.sourceId, personId), eq(relationships.targetId, personId)),
          ),
        );
      await tx
        .delete(persons)
        .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)));

      if (assertions.length > 0) {
        await tx.insert(relationships).values(
          assertions.map((assertion) => ({
            treeId,
            type: "asserted",
            sourceId: assertion.sourceId,
            targetId: assertion.targetId,
            assertedLabel: assertion.assertedLabel,
            derivationState: "asserted",
          })),
        );
      }
      return photos.map((photo) => photo.objectKey);
    });

    projectionCache.evict(treeId);
    await deleteStoredPhotoObjects(objectKeys, "person-deletion");
  }

  private derivedConnected(projection: KinshipGraphProjection, from: string, to: string): boolean {
    if (from === to) return true;
    const visited = new Set([from]);
    const frontier = [from];
    while (frontier.length > 0) {
      const current = frontier.shift()!;
      for (const step of projection.stepsFrom(current)) {
        if (step.to === to) return true;
        if (!visited.has(step.to)) {
          visited.add(step.to);
          frontier.push(step.to);
        }
      }
    }
    return false;
  }

  private async requirePerson(treeId: string, personId: string) {
    const person = await db
      .select()
      .from(persons)
      .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)))
      .then((rows) => rows[0]);
    if (!person) {
      throw ApiException.nodeNotAccessible("The target node is not accessible.");
    }
    return person;
  }
}

export const personDeletionService = new PersonDeletionService();
