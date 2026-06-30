import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { collaborationInvitations, treeCollaborators } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.userId) {
      throw ApiException.notAuthorized("Vui lòng đăng nhập để tham gia cây.");
    }

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get("inviteId");

    if (!inviteId) {
      throw ApiException.validation("inviteId", "Mã lời mời inviteId là bắt buộc.");
    }

    const invite = await db
      .select()
      .from(collaborationInvitations)
      .where(eq(collaborationInvitations.id, inviteId))
      .then((rows) => rows[0]);

    if (!invite) {
      throw ApiException.validation("inviteId", "Lời mời không tồn tại hoặc đã hết hạn.");
    }

    if (invite.status !== "pending" && invite.status !== "approved") {
      throw ApiException.validation("inviteId", "Lời mời này đã được sử dụng hoặc từ chối.");
    }

    // Mark as joined
    await db
      .update(collaborationInvitations)
      .set({ status: "joined" })
      .where(eq(collaborationInvitations.id, invite.id));

    // Add user as a collaborator
    const [collab] = await db
      .insert(treeCollaborators)
      .values({
        treeId: invite.treeId,
        userId: auth.userId,
        role: "contributor"
      })
      .onConflictDoNothing()
      .returning();

    return Response.json(collab || { success: true });
  });
}
