import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { dataRightsService } from "@/lib/services/dataRights";
import { auditService, AuditActions } from "@/lib/services/audit";

export async function GET(
  request: Request,
  { params }: { params: { personId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("User is not authenticated.");
    }

    const personId = params.personId;
    const res = await dataRightsService.exportNode(personId, auth.userId);

    await auditService.record(
      auth.userId,
      AuditActions.DATA_EXPORTED,
      "person",
      personId
    );

    return Response.json(res);
  });
}
