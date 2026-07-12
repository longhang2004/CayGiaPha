import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { getSafeInvitation } from "@/lib/services/collaborationInvitation";

export async function GET(_request: Request, { params }: { params: { inviteId: string } }) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.userId) throw ApiException.notAuthorized("Vui lòng đăng nhập để xem lời mời.");
    return Response.json(await getSafeInvitation(params.inviteId, auth.userId));
  });
}
