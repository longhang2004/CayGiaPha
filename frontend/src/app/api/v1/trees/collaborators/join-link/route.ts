import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { collaborationInvitations, treeCollaborators } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

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

    if (invite.status === "pending") {
      throw ApiException.validation("inviteId", "Yêu cầu tham gia đang chờ chủ cây duyệt.");
    }

    if (invite.status !== "approved" && invite.status !== "joined") {
      throw ApiException.validation("inviteId", "Lời mời này đã được sử dụng hoặc từ chối.");
    }

    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      throw ApiException.validation("inviteId", "Lời mời đã hết hạn sử dụng.");
    }

    // Already a collaborator? Treat as success (idempotent accept).
    const existing = await db
      .select()
      .from(treeCollaborators)
      .where(
        and(
          eq(treeCollaborators.treeId, invite.treeId),
          eq(treeCollaborators.userId, auth.userId),
        ),
      )
      .then((rows) => rows[0]);
    if (existing) {
      if (invite.status !== "joined") {
        await db
          .update(collaborationInvitations)
          .set({ status: "joined" })
          .where(eq(collaborationInvitations.id, invite.id));
      }
      return Response.json(existing);
    }

    // Explicit id: DB column may lack DEFAULT gen_random_uuid() on older schemas.
    const [collab] = await db
      .insert(treeCollaborators)
      .values({
        id: randomUUID(),
        treeId: invite.treeId,
        userId: auth.userId,
        role: "contributor",
      })
      .onConflictDoNothing()
      .returning();

    await db
      .update(collaborationInvitations)
      .set({ status: "joined" })
      .where(eq(collaborationInvitations.id, invite.id));

    if (collab) {
      return Response.json(collab);
    }

    const afterConflict = await db
      .select()
      .from(treeCollaborators)
      .where(
        and(
          eq(treeCollaborators.treeId, invite.treeId),
          eq(treeCollaborators.userId, auth.userId),
        ),
      )
      .then((rows) => rows[0]);

    return Response.json(afterConflict || { success: true, treeId: invite.treeId });
  });
}
