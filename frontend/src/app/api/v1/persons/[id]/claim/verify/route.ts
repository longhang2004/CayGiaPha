import { handleApiRoute } from "@/lib/services/routeHelper";
import { ApiException } from "@/lib/services/errors";
import { claimService } from "@/lib/services/claim";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const { treeId, identifier, code } = await request.json();
    if (!treeId) {
      throw ApiException.validation("treeId", "treeId is required.");
    }

    const personId = params.id;
    const claim = await claimService.verifyClaim(treeId, personId, identifier, code);

    return Response.json({
      claimId: claim.id,
      personId: claim.personId,
      userId: claim.userId,
      claimedAt: claim.claimedAt.toISOString(),
    });
  });
}
