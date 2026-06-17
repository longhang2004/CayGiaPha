import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { dataRightsService } from "@/lib/services/dataRights";
import { auditService, AuditActions } from "@/lib/services/audit";
import { cookies } from "next/headers";

export async function DELETE() {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("User is not authenticated.");
    }

    const userId = auth.userId;
    await dataRightsService.deleteAccount(userId);

    await auditService.record(
      userId,
      AuditActions.ACCOUNT_DELETED,
      "user",
      userId
    );

    // Clear session cookie
    cookies().delete("SESSION");

    return new Response(null, { status: 204 });
  });
}
