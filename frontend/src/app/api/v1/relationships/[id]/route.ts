import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import {
  formatRelationshipMutationResult,
  relationshipService,
} from "@/lib/services/relationship";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { handleApiRoute } from "@/lib/services/routeHelper";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.userId) {
      throw ApiException.notAuthorized("You must be signed in to edit a relationship.");
    }
    const body = await request.json().catch(() => ({}));
    const treeId = typeof body.treeId === "string" ? body.treeId : "";
    if (!treeId) throw ApiException.validation("treeId", "treeId is required.");
    await authorizationService.requireContentEditor(auth.userId, treeId);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await rateLimiter.check(`mutate-relationship:${auth.userId}`);
    await rateLimiter.check(`mutate-ip:${clientIp}`);

    const result = await relationshipService.update(treeId, params.id, {
      maritalStatus: body.maritalStatus,
      socialType: body.socialType,
      assertedLabel: body.assertedLabel,
    });
    return Response.json(formatRelationshipMutationResult(result));
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.userId) {
      throw ApiException.notAuthorized("You must be signed in to delete a relationship.");
    }
    const treeId = new URL(request.url).searchParams.get("treeId") ?? "";
    if (!treeId) throw ApiException.validation("treeId", "treeId is required.");
    await authorizationService.requireContentEditor(auth.userId, treeId);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await rateLimiter.check(`mutate-relationship:${auth.userId}`);
    await rateLimiter.check(`mutate-ip:${clientIp}`);

    await relationshipService.delete(treeId, params.id);
    return new Response(null, { status: 204 });
  });
}
