import { db } from "../../db";
import { regionKinshipTerms, relationships, persons, trees } from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { KinshipGraphProjection, Relationship } from "./projection";
import { KinshipResolver, CanonicalResolution, CanonicalRelation } from "./resolver";
import { SEEDED_KINSHIP_TERMS } from "./seededTerms";

export interface AddressResolution {
  status: "RESOLVED" | "ASSERTED" | "UNDEFINED_FOR_REGION" | "UNRESOLVED_NO_PATH" | "UNRESOLVED_INDETERMINATE_ORDER";
  term: string | null;
  relation: CanonicalRelation | null;
}

let isSeeded = false;

export async function ensureKinshipTermsSeeded() {
  if (isSeeded) {
    return;
  }

  try {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(regionKinshipTerms);
    const count = Number(countResult[0]?.count ?? 0);
    if (count > 0) {
      // Ensure existing grandparent terms are updated to nội/ngoại
      await db.update(regionKinshipTerms)
        .set({ term: "ông nội" })
        .where(eq(regionKinshipTerms.canonicalRelation, "u2:d0:PATERNAL:MALE:SELF:s0"));
      await db.update(regionKinshipTerms)
        .set({ term: "bà nội" })
        .where(eq(regionKinshipTerms.canonicalRelation, "u2:d0:PATERNAL:FEMALE:SELF:s0"));
      await db.update(regionKinshipTerms)
        .set({ term: "ông ngoại" })
        .where(eq(regionKinshipTerms.canonicalRelation, "u2:d0:MATERNAL:MALE:SELF:s0"));
      await db.update(regionKinshipTerms)
        .set({ term: "bà ngoại" })
        .where(eq(regionKinshipTerms.canonicalRelation, "u2:d0:MATERNAL:FEMALE:SELF:s0"));

      isSeeded = true;
      return;
    }

    console.log("Seeding region_kinship_terms table in Next.js backend...");
    
    // Batch insert in chunks of 50
    for (let i = 0; i < SEEDED_KINSHIP_TERMS.length; i += 50) {
      const chunk = SEEDED_KINSHIP_TERMS.slice(i, i + 50);
      await db.insert(regionKinshipTerms).values(chunk);
    }
    console.log("Seeding region_kinship_terms table completed successfully.");
    isSeeded = true;
  } catch (err) {
    console.error("Failed to seed region_kinship_terms table:", err);
    throw err;
  }
}

// Simple in-memory cache for graph projections to mimic KinshipGraphProjectionCache.
class KinshipGraphProjectionCache {
  private cache = new Map<string, { projection: KinshipGraphProjection; timestamp: number }>();
  private TTL = 30000; // 30 seconds

  async getProjection(treeId: string): Promise<KinshipGraphProjection> {
    const cached = this.cache.get(treeId);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.projection;
    }

    // Query active relationships from the database.
    const dbEdges = await db
      .select()
      .from(relationships)
      .where(eq(relationships.treeId, treeId));

    const edges: Relationship[] = dbEdges.map((e) => ({
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

    const projection = KinshipGraphProjection.fromEdges(treeId, edges);
    this.cache.set(treeId, { projection, timestamp: Date.now() });
    return projection;
  }

  evict(treeId: string) {
    this.cache.delete(treeId);
  }
}

export const projectionCache = new KinshipGraphProjectionCache();

export class KinshipAddressService {
  private resolver = new KinshipResolver();

  async resolveAddress(
    treeId: string,
    egoId: string,
    targetId: string
  ): Promise<AddressResolution> {
    // 6.4 - Short circuit: A direct asserted edge from ego to target wins verbatim.
    const assertedLabel = await this.lookupAssertedLabel(egoId, targetId);
    if (assertedLabel) {
      return {
        status: "ASSERTED",
        term: assertedLabel,
        relation: null,
      };
    }

    return this.resolveDerivedAddress(treeId, egoId, targetId);
  }

  async resolveDerivedAddress(
    treeId: string,
    egoId: string,
    targetId: string
  ): Promise<AddressResolution> {
    await ensureKinshipTermsSeeded();

    const treeRecord = await db
      .select()
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);

    if (!treeRecord) {
      return { status: "UNRESOLVED_NO_PATH", term: null, relation: null };
    }
    const region = treeRecord.region;

    const projection = await projectionCache.getProjection(treeId);

    // Load all people in the tree to build the lookup
    const allPeople = await db
      .select()
      .from(persons)
      .where(eq(persons.treeId, treeId));

    const peopleMap = new Map<string, typeof allPeople[0]>();
    for (const p of allPeople) {
      peopleMap.set(p.id, p);
    }

    const personLookup = (id: string) => {
      const p = peopleMap.get(id);
      if (!p) return undefined;
      return {
        id: p.id,
        gender: p.gender,
        birthOrder: p.birthOrder,
        birthYear: p.birthYear,
        displayName: p.displayName,
      };
    };

    const canonicalResolution = this.resolver.resolveCanonical(
      projection,
      egoId,
      targetId,
      personLookup
    );

    if (canonicalResolution.isUnresolved()) {
      return {
        status: canonicalResolution.status as any,
        term: null,
        relation: null,
      };
    }

    const relation = canonicalResolution.relation!;
    const key = relation.canonicalKey();

    // Look up in region_kinship_terms table
    const termRecord = await db
      .select()
      .from(regionKinshipTerms)
      .where(
        and(
          eq(regionKinshipTerms.region, region),
          eq(regionKinshipTerms.canonicalRelation, key)
        )
      )
      .then((rows) => rows[0]);

    if (termRecord) {
      return {
        status: "RESOLVED",
        term: termRecord.term,
        relation,
      };
    } else {
      return {
        status: "UNDEFINED_FOR_REGION",
        term: null,
        relation,
      };
    }
  }

  private async lookupAssertedLabel(egoId: string, targetId: string): Promise<string | null> {
    const edge = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.sourceId, egoId),
          eq(relationships.targetId, targetId),
          eq(relationships.type, "asserted"),
          eq(relationships.derivationState, "asserted")
        )
      )
      .then((rows) => rows[0]);

    return edge?.assertedLabel || null;
  }
}

export const kinshipAddressService = new KinshipAddressService();
