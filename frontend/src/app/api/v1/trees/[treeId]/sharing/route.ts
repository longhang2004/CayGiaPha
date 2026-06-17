import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { treeService } from "@/lib/services/tree";
import { auditService, AuditActions } from "@/lib/services/audit";

export async function PATCH(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;

    await authorizationService.requireOwner(auth.userId, auth.ownedTreeId, treeId);

    const { sharing } = await request.json();
    const tree = await treeService.changeSharing(treeId, sharing);

    await auditService.record(
      auth.userId,
      AuditActions.SHARING_CHANGED,
      "tree",
      treeId,
      tree.sharing
    );

    return Response.json({
      treeId: tree.id,
      sharing: tree.sharing,
    });
  });
}
