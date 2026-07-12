import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { approvePendingInvitation } from "@/lib/services/collaborationInvitation";

export async function POST(_request: Request, { params }: { params: { treeId: string; inviteId: string } }) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    await authorizationService.requireOwner(auth.userId, auth.ownedTreeId, params.treeId);
    await approvePendingInvitation(params.treeId, params.inviteId);
    return Response.json({ success: true, status: "joined" });
  });
}
