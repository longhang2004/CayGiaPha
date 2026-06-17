import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { searchService } from "@/lib/services/search";

export async function POST(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;
    const shareToken = request.headers.get("x-share-token");

    await authorizationService.requireReadAccess(auth.userId, auth.ownedTreeId, treeId, shareToken);

    const body = await request.json();
    const results = await searchService.search(
      treeId,
      body,
      auth.userId || "",
      auth.ownedTreeId
    );

    return Response.json(results);
  });
}
