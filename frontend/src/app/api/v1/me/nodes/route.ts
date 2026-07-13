import { getAuthContext } from "@/lib/services/authorization";
import { dataRightsService } from "@/lib/services/dataRights";
import { ApiException } from "@/lib/services/errors";
import { handleApiRoute } from "@/lib/services/routeHelper";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("User is not authenticated.");
    }
    return Response.json(await dataRightsService.listSubjectNodes(auth.userId));
  });
}
