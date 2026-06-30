import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { collaborationInvitations, treeCollaborators, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.userId) {
      throw ApiException.notAuthorized("Vui lòng đăng nhập để tham gia cây.");
    }

    const { searchParams } = new URL(request.url);
    const code = (searchParams.get("code") || "").trim().toLowerCase();

    if (!code || code.length !== 6) {
      throw ApiException.validation("code", "Mã mời 6 ký tự là bắt buộc.");
    }

    // Get current user email
    const user = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, auth.userId))
      .then((rows) => rows[0]);

    if (!user || !user.email) {
      throw ApiException.validation("code", "Tài khoản của bạn không có email hợp lệ.");
    }

    // Find invitation matching this code and user's email
    const invite = await db
      .select()
      .from(collaborationInvitations)
      .where(
        and(
          eq(collaborationInvitations.code, code),
          eq(collaborationInvitations.email, user.email)
        )
      )
      .then((rows) => rows[0]);

    if (!invite) {
      throw ApiException.validation("code", "Mã mời không đúng hoặc không thuộc về tài khoản này.");
    }

    if (invite.status !== "pending" && invite.status !== "approved") {
      throw ApiException.validation("code", "Lời mời này đã được sử dụng hoặc từ chối.");
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
