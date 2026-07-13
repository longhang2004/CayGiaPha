import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService, capabilitiesFor } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { persons, relationships, trees, claims, treeCollaborators, collaborationInvitations, personPhotos, inAppReminders, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/services/email";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { canViewMaritalStatus, projectPerson } from "@/lib/services/privacy";

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
    const accessRole = await authorizationService.classify(auth.userId, treeId);

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
      const role = await authorizationService.classify(auth.userId, treeId, person.id);
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

    const tree = await db
      .select()
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);

    if (!tree) {
      throw ApiException.validation("treeId", "Cây gia phả không tồn tại.");
    }

    // 1. Notify contributors
    const contributors = await db
      .select({ email: users.email })
      .from(treeCollaborators)
      .innerJoin(users, eq(treeCollaborators.userId, users.id))
      .where(eq(treeCollaborators.treeId, treeId));

    const pendingInvites = await db
      .select({ email: collaborationInvitations.email })
      .from(collaborationInvitations)
      .where(and(eq(collaborationInvitations.treeId, treeId), eq(collaborationInvitations.status, "pending")));

    const emails = new Set<string>();
    contributors.forEach((c) => { if (c.email) emails.add(c.email); });
    pendingInvites.forEach((i) => { if (i.email) emails.add(i.email); });

    for (const email of emails) {
      try {
        await sendEmail({
          to: email,
          subject: `Thông báo: Cây gia phả "${tree.name}" đã bị xóa`,
          text: `Chào bạn, chúng tôi xin thông báo cây gia phả "${tree.name}" mà bạn đang cộng tác tham gia đã bị xóa bởi chủ sở hữu.`,
          html: `<p>Chào bạn,</p><p>Chúng tôi xin thông báo cây gia phả <strong>"${tree.name}"</strong> mà bạn đang cộng tác tham gia đã bị xóa bởi chủ sở hữu.</p>`
        });
      } catch (err) {
        console.error(`Failed to notify ${email} of deletion`, err);
      }
    }

    // 2. Cascade delete
    const personRows = await db
      .select({ id: persons.id })
      .from(persons)
      .where(eq(persons.treeId, treeId));
    const personIds = personRows.map(p => p.id);

    if (personIds.length > 0) {
      await db.delete(personPhotos).where(inArray(personPhotos.personId, personIds));
      await db.delete(claims).where(inArray(claims.personId, personIds));
      await db.delete(inAppReminders).where(inArray(inAppReminders.personId, personIds));
    }

    await db.delete(relationships).where(eq(relationships.treeId, treeId));
    await db.delete(persons).where(eq(persons.treeId, treeId));
    await db.delete(treeCollaborators).where(eq(treeCollaborators.treeId, treeId));
    await db.delete(collaborationInvitations).where(eq(collaborationInvitations.treeId, treeId));
    await db.delete(trees).where(eq(trees.id, treeId));

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
