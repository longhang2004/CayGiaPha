import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { dataRightsService } from "@/lib/services/dataRights";
import { auditService, AuditActions } from "@/lib/services/audit";
import { cookies } from "next/headers";

export async function DELETE(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("User is not authenticated.");
    }

    const body = await request.json().catch(() => ({})) as { linkedNodeStrategy?: unknown };
    const linkedNodeStrategy = typeof body.linkedNodeStrategy === "string"
      ? body.linkedNodeStrategy.toLowerCase()
      : "anonymize";
    if (linkedNodeStrategy !== "anonymize" && linkedNodeStrategy !== "delete") {
      throw ApiException.validation(
        "linkedNodeStrategy",
        "Linked-node strategy must be 'delete' or 'anonymize'.",
      );
    }

    const userId = auth.userId;
    await dataRightsService.deleteAccount(userId, linkedNodeStrategy);

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
