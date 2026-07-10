import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizeAndValidateDisplayName } from "@/lib/account/displayName";
import { authorizationService, getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { handleApiRoute } from "@/lib/services/routeHelper";

export async function PATCH(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("Bạn cần đăng nhập để cập nhật hồ sơ.");
    }
    await authorizationService.requireAuthenticatedAccountMutation(auth.userId);

    const body = await request.json();
    const displayName = normalizeAndValidateDisplayName(body?.displayName);
    const [updated] = await db
      .update(users)
      .set({ displayName })
      .where(eq(users.id, auth.userId))
      .returning({ userId: users.id, displayName: users.displayName });

    if (!updated) {
      throw ApiException.notAuthorized("Bạn không có quyền cập nhật hồ sơ này.");
    }
    return Response.json({ userId: updated.userId, displayName: updated.displayName! });
  });
}
