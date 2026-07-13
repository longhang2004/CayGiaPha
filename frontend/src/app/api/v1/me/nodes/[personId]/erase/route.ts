import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { dataRightsService } from "@/lib/services/dataRights";
import { auditService, AuditActions } from "@/lib/services/audit";

export async function POST(
  request: Request,
  { params }: { params: { personId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("User is not authenticated.");
    }

    const { strategy, deletionStrategy } = await request.json();
    if (!strategy) {
      throw ApiException.validation("strategy", "Strategy is required (delete or anonymize).");
    }

    const cleanStrategy = strategy.toLowerCase();
    if (cleanStrategy !== "delete" && cleanStrategy !== "anonymize") {
      throw ApiException.validation("strategy", "Strategy must be 'delete' or 'anonymize'.");
    }

    const cleanDeletionStrategy = typeof deletionStrategy === "string"
      ? deletionStrategy.toLowerCase()
      : "preserve";
    if (cleanStrategy === "delete" && cleanDeletionStrategy !== "cascade" && cleanDeletionStrategy !== "preserve") {
      throw ApiException.validation(
        "deletionStrategy",
        "Deletion strategy must be 'cascade' or 'preserve'.",
      );
    }

    const personId = params.personId;
    await dataRightsService.eraseNode(
      personId,
      cleanStrategy as "delete" | "anonymize",
      auth.userId,
      cleanDeletionStrategy as "cascade" | "preserve",
    );

    await auditService.record(
      auth.userId,
      AuditActions.NODE_ERASED,
      "person",
      personId,
      cleanStrategy
    );

    return new Response(null, { status: 204 });
  });
}
