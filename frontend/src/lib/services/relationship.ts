import { db } from "../db";
import { relationships, persons, trees } from "../db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { ApiException } from "./errors";
import { projectionCache, kinshipAddressService } from "./kinship/address";

export interface CreateRelationshipCommand {
  treeId: string;
  type: string;
  sourceId: string;
  targetId: string;
  maritalStatus?: string | null;
  socialType?: string | null;
  assertedLabel?: string | null;
}

export interface ConflictWarning {
  sourceId: string;
  targetId: string;
  assertedLabel: string;
  derivedTerm: string;
}

export interface RelationshipMutationResult {
  edge: typeof relationships.$inferSelect;
  conflicts: ConflictWarning[];
}

const KNOWN_TYPES = new Set([
  "bloodline_father",
  "bloodline_mother",
  "marriage",
  "non_bloodline",
  "asserted",
]);

const BLOODLINE_TYPES = new Set(["bloodline_father", "bloodline_mother"]);
const MARITAL_STATUSES = new Set(["married", "divorced", "deceased"]);
const SOCIAL_TYPES = new Set(["friend", "teacher", "colleague"]);

const ASSERTED_LABEL_MIN = 1;
const ASSERTED_LABEL_MAX = 50;

export class RelationshipService {
  async create(command: CreateRelationshipCommand): Promise<RelationshipMutationResult> {
    const type = command.type;
    if (!type || !KNOWN_TYPES.has(type)) {
      throw ApiException.validation(
        "type",
        "Relationship type must be one of bloodline_father, bloodline_mother, marriage, non_bloodline, asserted."
      );
    }

    const { treeId, sourceId, targetId } = command;

    // (4.1, 4.2) An edge connects two distinct nodes.
    if (sourceId === targetId) {
      throw ApiException.selfReference("Source and target must be different persons.");
    }

    // (4.8, 5.5) Both referenced nodes must exist within the tree.
    await this.requireExistingNode(treeId, sourceId, "sourceId");
    await this.requireExistingNode(treeId, targetId, "targetId");

    // If a relationship already exists between these two persons (in either direction), overwrite it.
    const existingRelationship = await db
      .select()
      .from(relationships)
      .where(
        or(
          and(eq(relationships.sourceId, sourceId), eq(relationships.targetId, targetId)),
          and(eq(relationships.sourceId, targetId), eq(relationships.targetId, sourceId))
        )
      )
      .then((rows) => rows[0]);

    if (existingRelationship) {
      await db
        .delete(relationships)
        .where(eq(relationships.id, existingRelationship.id));
      projectionCache.evict(treeId);
    }

    // Bloodline edge rules
    if (BLOODLINE_TYPES.has(type)) {
      await this.validateBloodlineEdge(type, sourceId, targetId);
    }

    let maritalStatus: string | null = null;
    let socialType: string | null = null;
    let assertedLabel: string | null = null;
    let derivationState = "derived";

    if (type === "marriage") {
      if (!command.maritalStatus || !MARITAL_STATUSES.has(command.maritalStatus)) {
        throw ApiException.validation(
          "maritalStatus",
          "Marital status must be one of married, divorced, deceased."
        );
      }
      maritalStatus = command.maritalStatus;
    } else if (type === "non_bloodline") {
      if (!command.socialType || !SOCIAL_TYPES.has(command.socialType)) {
        throw ApiException.validation(
          "socialType",
          "Social type must be one of friend, teacher, colleague."
        );
      }
      socialType = command.socialType;
    } else if (type === "asserted") {
      if (
        !command.assertedLabel ||
        command.assertedLabel.length < ASSERTED_LABEL_MIN ||
        command.assertedLabel.length > ASSERTED_LABEL_MAX
      ) {
        throw ApiException.validation("assertedLabel", "Asserted label must be 1 to 50 characters.");
      }
      assertedLabel = command.assertedLabel;
      derivationState = "asserted";
    }

    // Insert relationship
    const [saved] = await db
      .insert(relationships)
      .values({
        treeId,
        type,
        sourceId,
        targetId,
        maritalStatus,
        socialType,
        assertedLabel,
        derivationState,
      })
      .returning();

    // Auto-create marriage if both parents exist now
    if (BLOODLINE_TYPES.has(type)) {
      await this.autoCreateMarriageIfBothParentsExist(treeId, type, sourceId, targetId);
    }

    // Invalidate cached projection
    projectionCache.evict(treeId);

    // Scan for upgrades if bloodline edge completed an asserted path
    let conflicts: ConflictWarning[] = [];
    if (BLOODLINE_TYPES.has(type)) {
      conflicts = await this.scanForUpgrades(treeId);
    }

    return { edge: saved, conflicts };
  }

  private async autoCreateMarriageIfBothParentsExist(
    treeId: string,
    type: string,
    parentId: string,
    childId: string
  ): Promise<void> {
    let fatherId: string | null = null;
    let motherId: string | null = null;

    if (type === "bloodline_father") {
      fatherId = parentId;
      const motherEdges = await db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.targetId, childId),
            eq(relationships.type, "bloodline_mother")
          )
        );
      if (motherEdges.length > 0) {
        motherId = motherEdges[0].sourceId;
      }
    } else if (type === "bloodline_mother") {
      motherId = parentId;
      const fatherEdges = await db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.targetId, childId),
            eq(relationships.type, "bloodline_father")
          )
        );
      if (fatherEdges.length > 0) {
        fatherId = fatherEdges[0].sourceId;
      }
    }

    if (fatherId && motherId) {
      // Check if there is already a marriage edge between them
      const marriageExists = await db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.type, "marriage"),
            or(
              and(eq(relationships.sourceId, fatherId), eq(relationships.targetId, motherId)),
              and(eq(relationships.sourceId, motherId), eq(relationships.targetId, fatherId))
            )
          )
        )
        .then((rows) => rows.length > 0);

      if (!marriageExists) {
        await db.insert(relationships).values({
          treeId,
          type: "marriage",
          sourceId: fatherId,
          targetId: motherId,
          maritalStatus: "married",
          derivationState: "derived",
        });
      }
    }
  }

  private async requireExistingNode(treeId: string, personId: string, field: string) {
    const exists = await db
      .select()
      .from(persons)
      .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)))
      .then((rows) => rows.length > 0);

    if (!exists) {
      throw ApiException.missingNode(
        field,
        `Referenced person ${personId} was not found in the tree.`
      );
    }
  }

  private async validateBloodlineEdge(type: string, parentId: string, childId: string) {
    const alreadyHasEdge = await db
      .select()
      .from(relationships)
      .where(and(eq(relationships.targetId, childId), eq(relationships.type, type)))
      .then((rows) => rows.length > 0);

    if (alreadyHasEdge) {
      const parent = type === "bloodline_father" ? "father" : "mother";
      throw ApiException.parentLimit(
        `Child ${childId} already has a ${parent} bloodline edge.`
      );
    }

    // (4.9) Cycle detection
    const isAncestor = await this.isBloodlineAncestor(childId, parentId);
    if (isAncestor) {
      throw ApiException.cycleViolation(
        `Adding this bloodline edge would create a parent-child cycle: ${childId} is already an ancestor of ${parentId}.`
      );
    }

    // Check gender consistency
    const person = await db
      .select()
      .from(persons)
      .where(eq(persons.id, parentId))
      .then((rows) => rows[0]);
    if (person && person.gender) {
      if (type === "bloodline_father" && person.gender === "female") {
        throw ApiException.validation(
          "type",
          "Cannot add relationship: a person with female gender cannot be registered as a father."
        );
      }
      if (type === "bloodline_mother" && person.gender === "male") {
        throw ApiException.validation(
          "type",
          "Cannot add relationship: a person with male gender cannot be registered as a mother."
        );
      }
    }

    // Check relationship type consistency (cannot be both a father and a mother)
    const otherEdgeType = type === "bloodline_father" ? "bloodline_mother" : "bloodline_father";
    const hasConflictingGenderEdge = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.sourceId, parentId),
          eq(relationships.type, otherEdgeType)
        )
      )
      .then((rows) => rows.length > 0);

    if (hasConflictingGenderEdge) {
      const otherLabel = otherEdgeType === "bloodline_father" ? "father" : "mother";
      throw ApiException.validation(
        "type",
        `Cannot add relationship: this person is already registered as a ${otherLabel} in another relationship.`
      );
    }
  }

  private async isBloodlineAncestor(candidateAncestorId: string, startId: string): Promise<boolean> {
    const visited = new Set<string>();
    const frontier: string[] = [startId];

    while (frontier.length > 0) {
      const current = frontier.pop()!;
      if (current === candidateAncestorId) {
        return true;
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      // Find parents (sources of incoming bloodline edges to current)
      const parentEdges = await db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.targetId, current),
            inArray(relationships.type, ["bloodline_father", "bloodline_mother"])
          )
        );

      for (const edge of parentEdges) {
        frontier.push(edge.sourceId);
      }
    }
    return false;
  }

  // ==========================================
  // ASSERTED UPGRADE SCANNER
  // ==========================================
  async scanForUpgrades(treeId: string): Promise<ConflictWarning[]> {
    // Find still-asserted relationships
    const assertedEdges = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          eq(relationships.type, "asserted"),
          eq(relationships.derivationState, "asserted")
        )
      );

    if (assertedEdges.length === 0) {
      return [];
    }

    const bloodlineAdjacency = await this.buildBloodlineAdjacency(treeId);
    const warnings: ConflictWarning[] = [];

    for (const edge of assertedEdges) {
      const a = edge.sourceId;
      const b = edge.targetId;

      if (!this.bloodlineConnected(a, b, bloodlineAdjacency)) {
        continue;
      }

      // Compute derived address
      const derived = await kinshipAddressService.resolveDerivedAddress(treeId, a, b);
      if (derived.status !== "RESOLVED") {
        continue;
      }

      const derivedTerm = derived.term!;
      const assertedLabel = edge.assertedLabel!;

      if (derivedTerm === assertedLabel) {
        // Match: verify and update edge to verified
        await db
          .update(relationships)
          .set({ derivationState: "verified" })
          .where(eq(relationships.id, edge.id));
      } else {
        // Mismatch: flag conflict, warn user
        await db
          .update(relationships)
          .set({ derivationState: "conflict" })
          .where(eq(relationships.id, edge.id));

        warnings.push({
          sourceId: a,
          targetId: b,
          assertedLabel,
          derivedTerm,
        });
      }
    }

    return warnings;
  }

  private async buildBloodlineAdjacency(treeId: string): Promise<Map<string, Set<string>>> {
    const adjacency = new Map<string, Set<string>>();

    const edges = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          inArray(relationships.type, ["bloodline_father", "bloodline_mother"])
        )
      );

    for (const edge of edges) {
      const source = edge.sourceId;
      const target = edge.targetId;

      if (!adjacency.has(source)) adjacency.set(source, new Set());
      adjacency.get(source)!.add(target);

      if (!adjacency.has(target)) adjacency.set(target, new Set());
      adjacency.get(target)!.add(source);
    }

    return adjacency;
  }

  private bloodlineConnected(a: string, b: string, adjacency: Map<string, Set<string>>): boolean {
    if (!a || !b || a === b) return false;
    if (!adjacency.has(a) || !adjacency.has(b)) return false;

    const visited = new Set<string>();
    const frontier: string[] = [a];
    visited.add(a);

    while (frontier.length > 0) {
      const current = frontier.shift()!;
      if (current === b) {
        return true;
      }
      for (const neighbour of adjacency.get(current) || []) {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          frontier.push(neighbour);
        }
      }
    }
    return false;
  }
}

export const relationshipService = new RelationshipService();
