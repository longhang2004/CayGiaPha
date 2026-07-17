import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService, capabilitiesFor } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { persons, relationships, trees, claims } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { canViewMaritalStatus, projectPerson } from "@/lib/services/privacy";
import { treeDeletionService } from "@/lib/services/treeDeletion";

export async function GET(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;
    const { searchParams } = new URL(request.url);
    // Prefer header; query param kept only for legacy clients.
    const shareToken = request.headers.get("x-share-token") || searchParams.get("shareToken");

    // Enforce read access
    await authorizationService.requireReadAccess(auth.userId, treeId, shareToken);

    // Fetch tree to check settings
    const tree = await db
      .select()
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);

    if (!tree) {
      throw ApiException.nodeNotAccessible("The specified tree was not found.");
    }
    const accessRole = await authorizationService.classify(auth.userId, treeId, null, shareToken);

    // Fetch all persons in the tree
    const dbPersons = await db
      .select()
      .from(persons)
      .where(eq(persons.treeId, treeId));

    // Fetch all claims in the tree
    const dbClaims = await db
      .select({ personId: claims.personId })
      .from(claims)
      .innerJoin(persons, eq(claims.personId, persons.id))
      .where(eq(persons.treeId, treeId));
    const claimedPersonIds = new Set(dbClaims.map((c) => c.personId));

    // Fetch all relationships in the tree
    const dbRelationships = await db
      .select()
      .from(relationships)
      .where(eq(relationships.treeId, treeId));

    const projectedPersons = [];
    const roleByPersonId = new Map<string, Awaited<ReturnType<typeof authorizationService.classify>>>();
    const personById = new Map(dbPersons.map((person) => [person.id, person]));
    for (const person of dbPersons) {
      const role = await authorizationService.classify(
        auth.userId,
        treeId,
        person.id,
        shareToken,
      );
      roleByPersonId.set(person.id, role);
      const projected = projectPerson(person, {
        role,
        livingRedaction: tree.livingRedaction !== false,
      });
      const { deathStatus, ...rest } = projected;

      projectedPersons.push({
        ...rest,
        deceased: deathStatus,
        claimed: claimedPersonIds.has(person.id),
        capabilities: capabilitiesFor(role, { personScoped: true }),
      });
    }

    return Response.json({
      treeId,
      name: tree.name,
      accessRole,
      capabilities: capabilitiesFor(accessRole),
      region: tree.region,
      sharing: tree.sharing,
      livingRedaction: tree.livingRedaction,
      persons: projectedPersons,
      relationships: dbRelationships.map((rel) => {
        const source = personById.get(rel.sourceId);
        const target = personById.get(rel.targetId);
        const maritalVisible = source && target
          ? canViewMaritalStatus(
              source,
              roleByPersonId.get(source.id) ?? "NONE",
              target,
              roleByPersonId.get(target.id) ?? "NONE",
            )
          : false;
        return {
          id: rel.id,
          type: rel.type,
          sourceId: rel.sourceId,
          targetId: rel.targetId,
          maritalStatus: maritalVisible ? rel.maritalStatus : undefined,
          derivationState: rel.derivationState,
          assertedLabel: rel.assertedLabel,
          socialType: rel.socialType,
        };
      }),
    });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;

    await authorizationService.requireOwner(auth.userId, treeId);
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await rateLimiter.check(`delete-tree:${auth.userId || clientIp}`);
    await rateLimiter.check(`mutate-ip:${clientIp}`);

    await treeDeletionService.delete(treeId);

    return Response.json({ success: true });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { treeId: string } },
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;
    await authorizationService.requireOwner(auth.userId, treeId);

    const body = await request.json().catch(() => null) as { name?: unknown } | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      throw ApiException.validation("name", "Tên cây gia phả không được để trống.");
    }
    if (name.length > 120) {
      throw ApiException.validation("name", "Tên cây gia phả không được dài quá 120 ký tự.");
    }

    const updated = await db
      .update(trees)
      .set({ name })
      .where(eq(trees.id, treeId))
      .returning({ id: trees.id, name: trees.name });
    const tree = updated[0];
    if (!tree) {
      throw ApiException.nodeNotAccessible("The specified tree was not found.");
    }
    return Response.json({ treeId: tree.id, name: tree.name });
  });
}
