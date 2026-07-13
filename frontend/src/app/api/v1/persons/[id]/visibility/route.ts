import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { personService } from "@/lib/services/person";
import { auditService, AuditActions } from "@/lib/services/audit";

function projectPerson(person: any) {
  const raw = {
    id: person.id,
    treeId: person.treeId,
    displayName: person.displayName,
    gender: person.gender,
    birthOrder: person.birthOrder,
    birthYear: person.birthYear,
    deathStatus: person.deathStatus,
    adoptionStatus: person.adoptionStatus,
    visMarital: person.visMarital,
    visAdoption: person.visAdoption,
    visDeath: person.visDeath,
    visName: person.visName,
    visBirthYear: person.visBirthYear,
    visPhoto: person.visPhoto,
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

export async function PATCH(
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
    await authorizationService.requireVisibilityEditor(auth.userId, treeId, personId);

    const body = await request.json();
    const updated = await personService.setVisibility(treeId, personId, body);

    await auditService.record(
      auth.userId,
      AuditActions.VISIBILITY_CHANGED,
      "person",
      personId
    );

    return Response.json(projectPerson(updated));
  });
}
