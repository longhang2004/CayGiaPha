import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { db } from "@/lib/db";
import { treeCollaborators, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;

    await authorizationService.requireReadAccess(auth.userId, auth.ownedTreeId, treeId);

    const collabs = await db
      .select({
        id: treeCollaborators.id,
        treeId: treeCollaborators.treeId,
        userId: treeCollaborators.userId,
        role: treeCollaborators.role,
        joinedAt: treeCollaborators.joinedAt,
        identifier: users.email,
      })
      .from(treeCollaborators)
      .innerJoin(users, eq(treeCollaborators.userId, users.id))
      .where(eq(treeCollaborators.treeId, treeId));

    // Keep userId as UUID for UI ownership checks; expose display label separately.
    return Response.json(
      collabs.map((c) => ({
        id: c.id,
        treeId: c.treeId,
        userId: c.userId,
        role: c.role,
        joinedAt: c.joinedAt,
        displayName: c.identifier || c.userId,
      })),
    );
  });
}
