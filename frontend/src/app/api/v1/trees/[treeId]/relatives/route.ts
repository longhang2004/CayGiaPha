import { authorizationService, getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { relativeService } from "@/lib/services/relative";
import { formatRelationshipMutationResult } from "@/lib/services/relationship";
import { handleApiRoute } from "@/lib/services/routeHelper";

interface RouteContext {
  params: { treeId: string };
}

export async function POST(request: Request, { params }: RouteContext) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("You must be signed in to add a relative.");
    }
    const treeId = params.treeId;
    await authorizationService.requireContentEditor(auth.userId, treeId);

    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await rateLimiter.check(`mutate-relative:${auth.userId}`);
    await rateLimiter.check(`mutate-ip:${clientIp}`);

    const body = await request.json();
    const result = await relativeService.create({
      treeId,
      person: body.person,
      relationship: body.relationship,
    });
    return Response.json({
      personId: result.personId,
      relationship: formatRelationshipMutationResult(result.relationship),
    }, { status: 201 });
  });
}
