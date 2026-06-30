import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { collaborationInvitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: { treeId: string; inviteId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const { treeId, inviteId } = params;

    // Enforce owner check
    await authorizationService.requireOwner(auth.userId, auth.ownedTreeId, treeId);

    const invite = await db
      .select()
      .from(collaborationInvitations)
      .where(
        and(
          eq(collaborationInvitations.id, inviteId),
          eq(collaborationInvitations.treeId, treeId)
        )
      )
      .then((rows) => rows[0]);

    if (!invite) {
      throw ApiException.validation("inviteId", "Lời mời không tồn tại.");
    }

    // Update status to rejected
    await db
      .update(collaborationInvitations)
      .set({ status: "rejected" })
      .where(eq(collaborationInvitations.id, inviteId));

    return Response.json({ success: true });
  });
}
