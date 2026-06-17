import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { treeService } from "@/lib/services/tree";

export async function PATCH(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;

    await authorizationService.requireOwner(auth.userId, auth.ownedTreeId, treeId);

    const { region } = await request.json();
    const tree = await treeService.changeRegion(treeId, region);

    return Response.json({
      treeId: tree.id,
      region: tree.region,
    });
  });
}
