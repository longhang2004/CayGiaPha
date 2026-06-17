import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { personService } from "@/lib/services/person";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.ownedTreeId) {
      throw ApiException.notAuthorized("User does not own a tree.");
    }

    const body = await request.json();
    const id = await personService.create({
      treeId: auth.ownedTreeId,
      displayName: body.displayName,
      gender: body.gender,
      birthOrder: body.birthOrder,
      birthYear: body.birthYear,
      deathStatus: body.deathStatus,
    });

    return Response.json({ id }, { status: 201 });
  });
}
