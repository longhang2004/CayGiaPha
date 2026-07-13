import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { personDeletionService } from "@/lib/services/personDeletion";
import { photoService } from "@/lib/services/photo";
import { auditService, AuditActions } from "@/lib/services/audit";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get("treeId");
    if (!treeId) {
      throw ApiException.validation("treeId", "treeId query parameter is required.");
    }

    const personId = params.id;
    await authorizationService.requireContentEditor(auth.userId, treeId, personId);

    const { strategy } = await request.json();
    if (!strategy) {
      throw ApiException.validation("strategy", "strategy is required (cascade or preserve).");
    }

    // Phase 2 Deletion execution
    await photoService.deleteAllForPerson(personId);
    await personDeletionService.execute(treeId, personId, strategy);

    await auditService.record(
      auth.userId,
      AuditActions.PERSON_DELETED,
      "person",
      personId,
      strategy
    );

    return new Response(null, { status: 204 });
  });
}
