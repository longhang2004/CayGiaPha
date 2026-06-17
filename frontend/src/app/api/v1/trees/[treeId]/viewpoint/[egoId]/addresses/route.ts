import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { persons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { projectionCache } from "@/lib/services/kinship/address";
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

    await authorizationService.requireReadAccess(auth.userId, auth.ownedTreeId, treeId, shareToken);

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

    const addresses = [];
    for (const targetId of targets) {
      const res = resolutions.get(targetId);
      if (res && res.isResolved() && res.relation) {
        addresses.push({
          personId: targetId,
          resolved: true,
          status: res.status,
          unresolvedIndicator: null,
          relation: {
            upCount: res.relation.upCount,
            downCount: res.relation.downCount,
            side: res.relation.side,
            targetGender: res.relation.targetGender,
            branchOrder: res.relation.branchOrder,
            spouseHop: res.relation.spouseHop,
            canonicalKey: res.relation.canonicalKey(),
          },
        });
      } else {
        addresses.push({
          personId: targetId,
          resolved: false,
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
