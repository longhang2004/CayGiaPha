import type { Address, ViewpointAddresses } from "@/lib/graph";
import type { Region } from "@/lib/region";
import { formatKinshipDisplayTerm } from "@/lib/services/kinship/ordinal";
import { KinshipGraphProjection } from "@/lib/services/kinship/projection";
import { KinshipResolver } from "@/lib/services/kinship/resolver";
import { SEEDED_KINSHIP_TERMS } from "@/lib/services/kinship/seededTerms";
import {
  MOCK_PERSONS,
  MOCK_RELATIONSHIPS,
  PROTOTYPE_TREE_ID,
} from "./mockData";

const PERSON_BY_ID = new Map(MOCK_PERSONS.map((person) => [person.id, person]));
const PROJECTION = KinshipGraphProjection.fromEdges(
  PROTOTYPE_TREE_ID,
  MOCK_RELATIONSHIPS.map((relationship) => ({
    ...relationship,
    treeId: PROTOTYPE_TREE_ID,
  })),
);
const RESOLVER = new KinshipResolver();

function regionalTerms(region: Region) {
  return new Map(
    SEEDED_KINSHIP_TERMS
      .filter((entry) => entry.region === region)
      .map((entry) => [entry.canonicalRelation, entry.term]),
  );
}

export function buildMockViewpointAddresses(
  egoId: string,
  region: Region,
): ViewpointAddresses {
  const targetIds = MOCK_PERSONS
    .filter((person) => person.id !== egoId)
    .map((person) => person.id);
  const resolutions = RESOLVER.resolveAllFrom(
    PROJECTION,
    egoId,
    targetIds,
    (personId) => PERSON_BY_ID.get(personId),
  );
  const terms = regionalTerms(region);
  const addresses: Address[] = targetIds.map((personId) => {
    const resolution = resolutions.get(personId);
    const relation = resolution?.relation;
    const baseTerm = relation
      ? terms.get(relation.canonicalKey())
      : undefined;
    if (!resolution?.isResolved() || !relation || !baseTerm) {
      return {
        personId,
        resolved: null,
        status: resolution?.status ?? "UNRESOLVED_NO_PATH",
        unresolvedIndicator: "unresolved",
        relation: null,
      };
    }

    return {
      personId,
      resolved: formatKinshipDisplayTerm({
        baseTerm,
        region,
        ordinalContext: resolution.ordinalContext,
        canExposeOrdinal: true,
      }),
      status: "resolved",
      unresolvedIndicator: null,
      relation: {
        canonicalKey: relation.canonicalKey(),
        upCount: relation.upCount,
        downCount: relation.downCount,
        side: relation.side === "SELF"
          ? "none"
          : relation.side.toLowerCase() as "paternal" | "maternal",
        targetGender: relation.targetGender.toLowerCase() as "male" | "female",
        branchOrder:
          relation.branchOrder === "ELDER" ||
          relation.branchOrder === "YOUNGER"
            ? relation.branchOrder.toLowerCase() as "elder" | "younger"
            : "unknown",
        spouseHop: relation.spouseHop,
      },
    };
  });

  if (PERSON_BY_ID.has(egoId)) {
    addresses.push({
      personId: egoId,
      resolved: "bản thân",
      status: "resolved",
      unresolvedIndicator: null,
      relation: null,
    });
  }

  return { egoId, addresses };
}
