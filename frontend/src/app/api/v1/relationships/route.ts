import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { relationshipService } from "@/lib/services/relationship";
import { rateLimiter } from "@/lib/services/rateLimiter";

function formatResponse(edge: any, conflicts: any[]) {
  const mappedConflicts =
    conflicts && conflicts.length > 0
      ? conflicts.map((c) => ({
          sourceId: c.sourceId,
          targetId: c.targetId,
          assertedLabel: c.assertedLabel,
          derivedTerm: c.derivedTerm,
        }))
      : null;

  const raw = {
    id: edge.id,
    treeId: edge.treeId,
    type: edge.type,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    maritalStatus: edge.maritalStatus,
    socialType: edge.socialType,
    assertedLabel: edge.assertedLabel,
    derivationState: edge.derivationState,
    conflicts: mappedConflicts,
  };

  const clean: any = {};
  for (const key of Object.keys(raw)) {
    const val = (raw as any)[key];
    if (val !== null && val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.ownedTreeId) {
      throw ApiException.notAuthorized("User does not own a tree.");
    }
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await rateLimiter.check(`mutate-relationship:${auth.userId || clientIp}`);
    await rateLimiter.check(`mutate-ip:${clientIp}`);

    const body = await request.json();

    const result = await relationshipService.create({
      treeId: auth.ownedTreeId,
      type: body.type,
      sourceId: body.sourceId,
      targetId: body.targetId,
      maritalStatus: body.maritalStatus,
      socialType: body.socialType,
      assertedLabel: body.assertedLabel,
    });

    return Response.json(formatResponse(result.edge, result.conflicts), {
      status: 201,
    });
  });
}
