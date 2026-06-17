import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { claimService } from "@/lib/services/claim";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.ownedTreeId) {
      throw ApiException.notAuthorized("User does not own a tree.");
    }

    const { destination } = await request.json();
    const personId = params.id;

    await claimService.invite(auth.ownedTreeId, personId, destination);

    return new Response(null, { status: 202 }); // Accepted
  });
}
