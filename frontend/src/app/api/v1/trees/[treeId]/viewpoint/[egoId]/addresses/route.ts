import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { persons, regionKinshipTerms, trees } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { projectionCache, ensureKinshipTermsSeeded } from "@/lib/services/kinship/address";
import { KinshipResolver } from "@/lib/services/kinship/resolver";

export async function GET(
  request: Request,
  { params }: { params: { treeId: string; egoId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;
    const egoId = params.egoId;
    const shareToken = request.headers.get("x-share-token");

    await authorizationService.requireReadAccess(auth.userId, treeId, shareToken);

    const allPersons = await db
      .select()
      .from(persons)
      .where(eq(persons.treeId, treeId));

    const ego = allPersons.find((p) => p.id === egoId);
    if (!ego) {
      throw ApiException.nodeNotAccessible("The selected viewpoint node is not in the tree.");
    }

    const targets = allPersons.filter((p) => p.id !== egoId).map((p) => p.id);

    const projection = await projectionCache.getProjection(treeId);
    const resolver = new KinshipResolver();

    const personMap = new Map(allPersons.map((p) => [p.id, p]));
    const lookupFn = (id: string) => {
      const p = personMap.get(id);
      if (!p) return undefined;
      return {
        id: p.id,
        gender: p.gender,
        birthOrder: p.birthOrder,
        birthYear: p.birthYear,
        displayName: p.displayName,
      };
    };

    const resolutions = resolver.resolveAllFrom(projection, egoId, targets, lookupFn);

    // Fetch tree to determine the region, then fetch regional kinship terms
    const treeRecord = await db
      .select()
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);
    const region = treeRecord?.region || "Bac";

    await ensureKinshipTermsSeeded();

    const regionTerms = await db
      .select()
      .from(regionKinshipTerms)
      .where(eq(regionKinshipTerms.region, region));
    const termMap = new Map(regionTerms.map((t) => [t.canonicalRelation, t.term]));

    const addresses = [];
    for (const targetId of targets) {
      const res = resolutions.get(targetId);
      if (res && res.isResolved() && res.relation) {
        const key = res.relation.canonicalKey();
        const term = termMap.get(key) || null;
        if (term) {
          addresses.push({
            personId: targetId,
            resolved: term,
            status: "resolved",
            unresolvedIndicator: null,
            relation: {
              upCount: res.relation.upCount,
              downCount: res.relation.downCount,
              side: res.relation.side,
              targetGender: res.relation.targetGender,
              branchOrder: res.relation.branchOrder,
              spouseHop: res.relation.spouseHop,
              canonicalKey: key,
            },
          });
        } else {
          addresses.push({
            personId: targetId,
            resolved: null,
            status: "unresolved",
            unresolvedIndicator: "unresolved",
            relation: null,
          });
        }
      } else {
        addresses.push({
          personId: targetId,
          resolved: null,
          status: res ? res.status : "UNRESOLVED_NO_PATH",
          unresolvedIndicator: "unresolved",
          relation: null,
        });
      }
    }

    // Strip nulls to match @JsonInclude(Include.NON_NULL)
    const cleanAddresses = addresses.map((addr) => {
      const cleanAddr: any = {};
      for (const key of Object.keys(addr)) {
        const val = (addr as any)[key];
        if (val !== null && val !== undefined) {
          cleanAddr[key] = val;
        }
      }
      return cleanAddr;
    });

    return Response.json({
      egoId,
      addresses: cleanAddresses,
    });
  });
}
