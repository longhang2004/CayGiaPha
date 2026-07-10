import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { collaborationInvitations, treeCollaborators, users } from "@/lib/db/schema";
import { and, eq, or, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

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

    const user = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, auth.userId))
      .then((rows) => rows[0]);

    // Match email invite for this user, or generic share codes (email null).
    const invite = await db
      .select()
      .from(collaborationInvitations)
      .where(
        and(
          eq(collaborationInvitations.code, code),
          user?.email
            ? or(
                eq(collaborationInvitations.email, user.email),
                isNull(collaborationInvitations.email),
                eq(collaborationInvitations.status, "generic"),
              )
            : or(
                isNull(collaborationInvitations.email),
                eq(collaborationInvitations.status, "generic"),
              ),
        ),
      )
      .then((rows) => rows[0]);

    if (!invite) {
      throw ApiException.validation("code", "Mã mời không đúng hoặc không thuộc về tài khoản này.");
    }

    if (invite.status === "pending") {
      throw ApiException.validation("code", "Yêu cầu tham gia đang chờ chủ cây duyệt.");
    }

    if (invite.status !== "approved" && invite.status !== "generic" && invite.status !== "joined") {
      throw ApiException.validation("code", "Lời mời này đã được sử dụng hoặc từ chối.");
    }

    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      throw ApiException.validation("code", "Mã mời đã hết hạn sử dụng.");
    }

    // Generic codes create a pending request for owner approval.
    if (invite.status === "generic") {
      const [pending] = await db
        .insert(collaborationInvitations)
        .values({
          id: randomUUID(),
          treeId: invite.treeId,
          inviterUserId: invite.inviterUserId,
          email: user?.email || null,
          code: randomUUID().replace(/-/g, "").slice(0, 6),
          status: "pending",
          expiresAt: invite.expiresAt,
        })
        .returning();
      return Response.json(pending);
    }

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
      return Response.json(existing);
    }

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

    return Response.json(collab || { success: true, treeId: invite.treeId });
  });
}
