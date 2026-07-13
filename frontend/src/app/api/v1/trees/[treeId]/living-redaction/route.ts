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

    await authorizationService.requireOwner(auth.userId, treeId);

    const { enabled } = await request.json();
    if (enabled === undefined) {
      throw ApiException.validation("enabled", "enabled body parameter is required.");
    }

    const tree = await treeService.setLivingRedaction(treeId, enabled);

    await auditService.record(
      auth.userId,
      AuditActions.LIVING_REDACTION_CHANGED,
      "tree",
      treeId,
      String(tree.livingRedaction)
    );

    return Response.json({
      treeId: tree.id,
      enabled: tree.livingRedaction,
    });
  });
}
