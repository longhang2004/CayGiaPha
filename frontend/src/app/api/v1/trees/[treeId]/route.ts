import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { persons, relationships, trees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const REDACTED_NAME_PLACEHOLDER = "Người thân còn sống";

function isLiving(person: any) {
  if (person.deathStatus) return false;
  const birthYear = person.birthYear;
  if (birthYear === null || birthYear === undefined) return true;
  const currentYear = new Date().getUTCFullYear();
  return birthYear > currentYear - 100;
}

export async function GET(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get("shareToken") || request.headers.get("x-share-token");

    // Enforce read access
    await authorizationService.requireReadAccess(auth.userId, auth.ownedTreeId, treeId, shareToken);

    // Fetch tree to check settings
    const tree = await db
      .select()
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);

    if (!tree) {
      throw ApiException.nodeNotAccessible("The specified tree was not found.");
    }

    // Fetch all persons in the tree
    const dbPersons = await db
      .select()
      .from(persons)
      .where(eq(persons.treeId, treeId));

    // Fetch all relationships in the tree
    const dbRelationships = await db
      .select()
      .from(relationships)
      .where(eq(relationships.treeId, treeId));

    const visible = (priv: boolean, visibility: string) => priv || visibility === "public";

    const projectedPersons = [];
    for (const person of dbPersons) {
      const role = await authorizationService.classify(auth.userId, auth.ownedTreeId, treeId, person.id);
      const privileged = role !== "NEITHER";
      const redactLiving = !privileged && (tree.livingRedaction !== false) && isLiving(person);

      const nameHidden = redactLiving || (!privileged && person.visName === "private");
      const birthYearHidden = redactLiving || (!privileged && person.visBirthYear === "private");

      projectedPersons.push({
        id: person.id,
        displayName: nameHidden ? REDACTED_NAME_PLACEHOLDER : person.displayName,
        gender: person.gender,
        birthOrder: redactLiving ? null : person.birthOrder,
        birthYear: birthYearHidden ? null : person.birthYear,
        phone: privileged && !redactLiving ? person.phone : undefined,
        email: privileged && !redactLiving ? person.email : undefined,
        deceased: visible(privileged, person.visDeath) ? person.deathStatus : undefined,
        visName: person.visName,
        visBirthYear: person.visBirthYear,
        visPhoto: person.visPhoto,
        visDeath: person.visDeath,
        visMarital: person.visMarital,
        visAdoption: person.visAdoption,
      });
    }

    return Response.json({
      treeId,
      region: tree.region,
      sharing: tree.sharing,
      livingRedaction: tree.livingRedaction,
      persons: projectedPersons,
      relationships: dbRelationships.map((rel) => ({
        id: rel.id,
        type: rel.type,
        sourceId: rel.sourceId,
        targetId: rel.targetId,
        derivationState: rel.derivationState,
        assertedLabel: rel.assertedLabel,
        socialType: rel.socialType,
      })),
    });
  });
}
