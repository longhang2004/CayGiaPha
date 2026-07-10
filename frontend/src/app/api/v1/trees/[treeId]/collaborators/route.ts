import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { db } from "@/lib/db";
import { treeCollaborators, trees, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ApiException } from "@/lib/services/errors";

export async function GET(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;

    await authorizationService.requireCollaborationRosterAccess(auth.userId, treeId);

    const owner = await db
      .select({
        treeId: trees.id,
        userId: users.id,
        displayName: users.displayName,
        email: users.email,
        joinedAt: trees.createdAt,
      })
      .from(trees)
      .innerJoin(users, eq(trees.ownerUserId, users.id))
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);

    if (!owner) {
      throw ApiException.notAuthorized("You are not authorized to view this collaboration roster.");
    }

    const collabs = await db
      .select({
        id: treeCollaborators.id,
        treeId: treeCollaborators.treeId,
        userId: treeCollaborators.userId,
        role: treeCollaborators.role,
        joinedAt: treeCollaborators.joinedAt,
        displayName: users.displayName,
        email: users.email,
      })
      .from(treeCollaborators)
      .innerJoin(users, eq(treeCollaborators.userId, users.id))
      .where(eq(treeCollaborators.treeId, treeId));

    return Response.json(
      [
        ...(owner
          ? [{
              id: `owner:${treeId}`,
              treeId: owner.treeId,
              userId: owner.userId,
              displayName: owner.displayName,
              email: owner.email,
              role: "owner" as const,
              joinedAt: owner.joinedAt,
            }]
          : []),
        ...collabs.map((c) => ({
        id: c.id,
        treeId: c.treeId,
        userId: c.userId,
        displayName: c.displayName,
        email: c.email,
        role: "contributor" as const,
        joinedAt: c.joinedAt,
        })),
      ],
    );
  });
}
