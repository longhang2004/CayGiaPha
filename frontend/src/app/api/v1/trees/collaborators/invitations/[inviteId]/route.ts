import { handleApiRoute } from "@/lib/services/routeHelper";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { collaborationInvitations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { inviteId: string } }
) {
  return handleApiRoute(async () => {
    const inviteId = params.inviteId;

    const invite = await db
      .select()
      .from(collaborationInvitations)
      .where(eq(collaborationInvitations.id, inviteId))
      .then((rows) => rows[0]);

    if (!invite) {
      throw ApiException.validation("inviteId", "Lời mời không tồn tại hoặc đã hết hạn.");
    }

    return Response.json(invite);
  });
}
