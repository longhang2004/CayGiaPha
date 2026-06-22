import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { personService } from "@/lib/services/person";
import { personDeletionService } from "@/lib/services/personDeletion";
import { db } from "@/lib/db";
import { trees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const REDACTED_NAME_PLACEHOLDER = "Người thân còn sống";

function isLiving(person: any) {
  if (person.deathStatus) return false;
  const birthYear = person.birthYear;
  if (birthYear === null || birthYear === undefined) return true;
  const currentYear = new Date().getUTCFullYear();
  return birthYear > currentYear - 100;
}

function projectPerson(person: any, privileged: boolean, redactLiving: boolean) {
  const nameHidden = redactLiving || (!privileged && person.visName === "private");
  const birthYearHidden = redactLiving || (!privileged && person.visBirthYear === "private");

  const visible = (priv: boolean, visibility: string) => priv || visibility === "public";

  const raw = {
    id: person.id,
    treeId: person.treeId,
    displayName: nameHidden ? REDACTED_NAME_PLACEHOLDER : person.displayName,
    gender: person.gender,
    birthOrder: redactLiving ? null : person.birthOrder,
    birthYear: birthYearHidden ? null : person.birthYear,
    phone: privileged && !redactLiving ? person.phone : null,
    email: privileged && !redactLiving ? person.email : null,
    deathStatus: visible(privileged, person.visDeath) ? person.deathStatus : null,
    adoptionStatus: visible(privileged, person.visAdoption) ? person.adoptionStatus : null,
    visMarital: person.visMarital,
    visAdoption: person.visAdoption,
    visDeath: person.visDeath,
    visName: person.visName,
    visBirthYear: person.visBirthYear,
    visPhoto: person.visPhoto,
  };

  // Strip null and undefined properties to match @JsonInclude(Include.NON_NULL)
  const clean: any = {};
  for (const key of Object.keys(raw)) {
    const val = (raw as any)[key];
    if (val !== null && val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

export async function GET(
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

    const shareToken = request.headers.get("x-share-token");
    await authorizationService.requireReadAccess(auth.userId, auth.ownedTreeId, treeId, shareToken);

    const personId = params.id;
    const person = await personService.read(treeId, personId);

    const role = await authorizationService.classify(auth.userId, auth.ownedTreeId, treeId, personId);
    const privileged = role !== "NEITHER";

    const tree = await db
      .select()
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);

    const redactLiving = !privileged && (tree?.livingRedaction !== false) && isLiving(person);

    return Response.json(projectPerson(person, privileged, redactLiving));
  });
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
    await authorizationService.requireMutationPermitted(auth.userId, auth.ownedTreeId, treeId, personId);

    const body = await request.json();
    const updated = await personService.edit(treeId, personId, body);

    return Response.json(projectPerson(updated, true, false));
  });
}

export async function DELETE(
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
    await authorizationService.requireOwner(auth.userId, auth.ownedTreeId, treeId);

    const res = await personDeletionService.beginDeletion(treeId, personId);
    return Response.json(res);
  });
}
