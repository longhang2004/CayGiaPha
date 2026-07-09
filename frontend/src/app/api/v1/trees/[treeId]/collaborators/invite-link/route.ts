import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { collaborationInvitations } from "@/lib/db/schema";
import crypto from "crypto";

function generateRandomCode(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function POST(
  _request: Request,
  { params }: { params: { treeId: string } },
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;

    if (!auth.userId) {
      throw ApiException.notAuthorized("Vui lòng đăng nhập để tạo mã mời.");
    }

    await authorizationService.requireOwner(auth.userId, auth.ownedTreeId, treeId);

    const code = generateRandomCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invite] = await db
      .insert(collaborationInvitations)
      .values({
        treeId,
        inviterUserId: auth.userId,
        email: null,
        code,
        status: "generic",
        expiresAt,
      })
      .returning();

    return Response.json(invite);
  });
}
