import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { personService } from "@/lib/services/person";
import { personDeletionService } from "@/lib/services/personDeletion";
import { db } from "@/lib/db";
import { trees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimiter } from "@/lib/services/rateLimiter";

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
    deathDay: visible(privileged, person.visDeath) ? person.deathDay : null,
    deathMonth: visible(privileged, person.visDeath) ? person.deathMonth : null,
    deathYear: visible(privileged, person.visDeath) ? person.deathYear : null,
    deathCalendar: visible(privileged, person.visDeath) ? person.deathCalendar : null,
    deathLunarLeap: visible(privileged, person.visDeath) ? person.deathLunarLeap : null,
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
    await authorizationService.requireReadAccess(auth.userId, treeId, shareToken);

    const personId = params.id;
    const person = await personService.read(treeId, personId);

    const role = await authorizationService.classify(auth.userId, treeId, personId);
    const privileged = role === "OWNER" || role === "CONTRIBUTOR" || role === "LINKED";

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
    await authorizationService.requireContentEditor(auth.userId, treeId, personId);
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await rateLimiter.check(`mutate-person:${auth.userId || clientIp}`);
    await rateLimiter.check(`mutate-ip:${clientIp}`);

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
    await authorizationService.requireContentEditor(auth.userId, treeId, personId);

    const res = await personDeletionService.beginDeletion(treeId, personId);
    return Response.json(res);
  });
}
