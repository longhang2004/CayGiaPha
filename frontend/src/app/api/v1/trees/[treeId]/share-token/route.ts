import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { treeService } from "@/lib/services/tree";
import { auditService, AuditActions } from "@/lib/services/audit";

export async function POST(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;

    await authorizationService.requireOwner(auth.userId, treeId);

    const token = await treeService.issueShareToken(treeId);

    await auditService.record(
      auth.userId,
      AuditActions.SHARE_TOKEN_ISSUED,
      "tree",
      treeId
    );

    return Response.json({ treeId, token });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;

    await authorizationService.requireOwner(auth.userId, treeId);

    await treeService.revokeShareToken(treeId);

    await auditService.record(
      auth.userId,
      AuditActions.SHARE_TOKEN_REVOKED,
      "tree",
      treeId
    );

    return new Response(null, { status: 204 });
  });
}
