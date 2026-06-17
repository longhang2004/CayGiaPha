import { db } from "../db";
import { persons, relationships } from "../db/schema";
import { eq, and, inArray, or } from "drizzle-orm";
import { ApiException } from "./errors";
import { projectionCache, kinshipAddressService } from "./kinship/address";
import { relationshipService } from "./relationship";
import { KinshipGraphProjection } from "./kinship/projection";

export class PersonDeletionService {
  async beginDeletion(treeId: string, personId: string) {
    await this.requirePerson(treeId, personId);
    return {
      personId,
      strategies: ["cascade", "preserve"],
    };
  }

  async execute(treeId: string, personId: string, strategy: string): Promise<void> {
    if (strategy === "cascade") {
      await this.deleteCascade(treeId, personId);
    } else if (strategy === "preserve") {
      await this.deletePreserve(treeId, personId);
    } else {
      throw ApiException.validation(
        "strategy",
        "Deletion strategy must be one of cascade or preserve."
      );
    }
  }

  async deleteCascade(treeId: string, personId: string): Promise<void> {
    await this.requirePerson(treeId, personId);

    const edges = await db
      .select()
      .from(relationships)
      .where(eq(relationships.treeId, treeId));

    // Calculate degrees and neighbors
    const degree = new Map<string, number>();
    const neighbors = new Map<string, string[]>();

    for (const edge of edges) {
      const a = edge.sourceId;
      const b = edge.targetId;

      degree.set(a, (degree.get(a) || 0) + 1);
      degree.set(b, (degree.get(b) || 0) + 1);

      if (!neighbors.has(a)) neighbors.set(a, []);
      neighbors.get(a)!.push(b);

      if (!neighbors.has(b)) neighbors.set(b, []);
      neighbors.get(b)!.push(a);
    }

    const removed = new Set<string>();
    const worklist: string[] = [personId];
    removed.add(personId);

    while (worklist.length > 0) {
      const current = worklist.shift()!;
      const curNeighbors = neighbors.get(current) || [];

      for (const neighbor of curNeighbors) {
        if (removed.has(neighbor)) {
          continue;
        }

        const remaining = (degree.get(neighbor) || 0) - 1;
        degree.set(neighbor, remaining);

        if (remaining <= 0) {
          removed.add(neighbor);
          worklist.push(neighbor);
        }
      }
    }

    const removedArray = Array.from(removed);

    // Delete incident edges
    await db
      .delete(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          or(
            inArray(relationships.sourceId, removedArray),
            inArray(relationships.targetId, removedArray)
          )
        )
      );

    // Delete persons
    await db
      .delete(persons)
      .where(
        and(
          eq(persons.treeId, treeId),
          inArray(persons.id, removedArray)
        )
      );

    // Evict cached projection
    projectionCache.evict(treeId);
  }

  async deletePreserve(treeId: string, personId: string): Promise<void> {
    await this.requirePerson(treeId, personId);

    const edges = await db
      .select()
      .from(relationships)
      .where(eq(relationships.treeId, treeId));

    // 15.5 Step 1: Find target's derived neighbors BEFORE deletion
    const preProjection = await projectionCache.getProjection(treeId);
    const derivedNeighbors: string[] = [];
    const seenNeighbors = new Set<string>();

    for (const step of preProjection.stepsFrom(personId)) {
      const neighbor = step.to;
      if (neighbor !== personId && !seenNeighbors.has(neighbor)) {
        seenNeighbors.add(neighbor);
        derivedNeighbors.push(neighbor);
      }
    }

    // Capture pre-deletion addresses for every unordered neighbor pair
    const definedAddresses = new Map<string, string>(); // Keyed by "A:B", value is the term
    for (let i = 0; i < derivedNeighbors.length; i++) {
      for (let j = i + 1; j < derivedNeighbors.length; j++) {
        const a = derivedNeighbors[i];
        const b = derivedNeighbors[j];
        const resolution = await kinshipAddressService.resolveAddress(treeId, a, b);

        if (resolution.status === "RESOLVED") {
          definedAddresses.set(`${a}:${b}`, resolution.term!);
        }
      }
    }

    // 15.4 Step 2: Delete target person and all incident edges
    await db
      .delete(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          inArray(relationships.id, edges.filter(
            (e) => e.sourceId === personId || e.targetId === personId
          ).map((e) => e.id))
        )
      );

    await db
      .delete(persons)
      .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)));

    // Invalidate cached projection
    projectionCache.evict(treeId);

    // 15.5 Step 4: Re-derive connectivity and create asserted relationships for cut-node pairs
    const survivingEdges = edges.filter(
      (e) => e.sourceId !== personId && e.targetId !== personId
    );

    const mappedEdges = survivingEdges.map((e) => ({
      id: e.id,
      treeId: e.treeId,
      type: e.type,
      sourceId: e.sourceId,
      targetId: e.targetId,
      maritalStatus: e.maritalStatus,
      socialType: e.socialType,
      assertedLabel: e.assertedLabel,
      derivationState: e.derivationState,
    }));

    const postProjection = KinshipGraphProjection.fromEdges(treeId, mappedEdges);

    for (const [key, term] of definedAddresses.entries()) {
      const [a, b] = key.split(":");
      if (!this.derivedConnected(postProjection, a, b)) {
        // Create an asserted relationship with the pre-deletion term
        await relationshipService.create({
          treeId,
          type: "asserted",
          sourceId: a,
          targetId: b,
          assertedLabel: term,
        });
      }
    }
  }

  private derivedConnected(projection: KinshipGraphProjection, from: string, to: string): boolean {
    if (from === to) return true;
    const visited = new Set<string>();
    const frontier: string[] = [from];
    visited.add(from);

    while (frontier.length > 0) {
      const current = frontier.shift()!;
      for (const step of projection.stepsFrom(current)) {
        const next = step.to;
        if (next === to) {
          return true;
        }
        if (!visited.has(next)) {
          visited.add(next);
          frontier.push(next);
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
