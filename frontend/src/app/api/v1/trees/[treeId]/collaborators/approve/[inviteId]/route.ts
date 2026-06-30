import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { collaborationInvitations, treeCollaborators, users } from "@/lib/db/schema";
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

    if (invite.status !== "pending") {
      throw ApiException.validation("inviteId", "Lời mời đã được xử lý hoặc hết hạn.");
    }

    // Update status to approved
    await db
      .update(collaborationInvitations)
      .set({ status: "approved" })
      .where(eq(collaborationInvitations.id, inviteId));

    // Find if user already exists
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, invite.email))
      .then((rows) => rows[0]);

    if (user) {
      // Add collaborator record directly
      await db
        .insert(treeCollaborators)
        .values({
          treeId: invite.treeId,
          userId: user.id,
          role: "contributor"
        })
        .onConflictDoNothing();
    }

    return Response.json({ success: true });
  });
}
