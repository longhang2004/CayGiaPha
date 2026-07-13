import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { searchService } from "@/lib/services/search";
import { rateLimiter } from "@/lib/services/rateLimiter";

export async function POST(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;
    const shareToken = request.headers.get("x-share-token");

    await authorizationService.requireReadAccess(auth.userId, treeId, shareToken);
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await rateLimiter.check(`search:${auth.userId || clientIp}`);
    await rateLimiter.check(`search-ip:${clientIp}`);

    const body = await request.json();
    const results = await searchService.search(
      treeId,
      body,
      auth.userId || ""
    );

    return Response.json(results);
  });
}
