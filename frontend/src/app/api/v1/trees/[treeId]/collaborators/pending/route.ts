import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { db } from "@/lib/db";
import { collaborationInvitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;

    // Enforce owner check
    await authorizationService.requireOwner(auth.userId, treeId);

    const pendings = await db
      .select()
      .from(collaborationInvitations)
      .where(
        and(
          eq(collaborationInvitations.treeId, treeId),
          eq(collaborationInvitations.status, "pending")
        )
      );

    return Response.json(pendings);
  });
}
