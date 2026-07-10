import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { collaborationInvitations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { inviteId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated) {
      throw ApiException.notAuthorized("Vui lòng đăng nhập để xem lời mời.");
    }

    const inviteId = params.inviteId;

    const invite = await db
      .select({
        id: collaborationInvitations.id,
        treeId: collaborationInvitations.treeId,
        email: collaborationInvitations.email,
        status: collaborationInvitations.status,
        expiresAt: collaborationInvitations.expiresAt,
      })
      .from(collaborationInvitations)
      .where(eq(collaborationInvitations.id, inviteId))
      .then((rows) => rows[0]);

    if (!invite) {
      throw ApiException.validation("inviteId", "Lời mời không tồn tại hoặc đã hết hạn.");
    }

    // Never return the raw invite code (prevents IDOR code leak).
    return Response.json(invite);
  });
}
