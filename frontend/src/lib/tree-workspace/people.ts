import { Person, Relationship, Address, addressLabel } from "@/lib/graph";
import { normalizeName } from "@/lib/nameNormalize";

export type FocusRelationKind = "father" | "mother" | "spouse" | "child" | "asserted" | "social";

export interface FocusRelation {
  relationshipId: string;
  person: Person;
  kind: FocusRelationKind;
  label: string;
  address?: Address;
}

export interface WorkspacePeopleFilters {
  gender: "all" | "male" | "female";
  side: "all" | "paternal" | "maternal" | "none";
  birthYearFrom?: number;
  birthYearTo?: number;
  lifeStatus: "all" | "living" | "deceased";
  claimedStatus: "all" | "claimed" | "unclaimed";
  relationshipType:
    | "all"
    | "bloodline"
    | "marriage"
    | "asserted"
    | "social";
}

export const DEFAULT_WORKSPACE_PEOPLE_FILTERS: WorkspacePeopleFilters = {
  gender: "all",
  side: "all",
  lifeStatus: "all",
  claimedStatus: "all",
  relationshipType: "all",
};

export function getFocusRelations(
  focusPersonId: string,
  persons: Person[],
  relationships: Relationship[],
  addresses: Map<string, Address>
): FocusRelation[] {
  const relations: FocusRelation[] = [];
  const personMap = new Map(persons.map((p) => [p.id, p]));

  for (const rel of relationships) {
    if (rel.sourceId === focusPersonId || rel.targetId === focusPersonId) {
      const otherId = rel.sourceId === focusPersonId ? rel.targetId : rel.sourceId;
      const otherPerson = personMap.get(otherId);
      if (!otherPerson) continue;

      let kind: FocusRelationKind = "social";
      let label = "Quan hệ xã hội";

      if (rel.type === "bloodline_father") {
        if (rel.targetId === focusPersonId) {
          kind = "father";
          label = "Cha";
        } else {
          kind = "child";
          label = "Con";
        }
      } else if (rel.type === "bloodline_mother") {
        if (rel.targetId === focusPersonId) {
          kind = "mother";
          label = "Mẹ";
        } else {
          kind = "child";
          label = "Con";
        }
      } else if (rel.type === "marriage") {
        kind = "spouse";
        label = "Vợ/chồng";
      } else if (rel.type === "asserted" && rel.assertedLabel) {
        kind = "asserted";
        label = rel.assertedLabel;
      }

      relations.push({
        relationshipId: rel.id,
        person: otherPerson,
        kind,
        label,
        address: addresses.get(otherPerson.id),
      });
    }
  }

  // Sort relations: parents first (father, mother), then spouse, then children, then asserted/social
  const kindOrder: Record<FocusRelationKind, number> = {
    father: 1,
    mother: 2,
    spouse: 3,
    child: 4,
    asserted: 5,
    social: 6,
  };

  relations.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]);

  return relations;
}

export function filterWorkspacePeople(
  persons: Person[],
  addresses: Map<string, Address>,
  query: string
): Person[] {
  if (!query.trim()) return persons;
  const normalizedQuery = normalizeName(query);

  return persons.filter((person) => {
    if (normalizeName(person.displayName).includes(normalizedQuery)) return true;
    const address = addresses.get(person.id);
    if (address) {
      const labelText = addressLabel(address);
      if (labelText && normalizeName(labelText).includes(normalizedQuery)) return true;
    }
    return false;
  });
}

interface FilterWorkspacePeopleInput {
  persons: Person[];
  relationships: Relationship[];
  addresses: Map<string, Address>;
  query: string;
  filters: WorkspacePeopleFilters;
}

function matchesRelationshipType(
  personId: string,
  relationships: Relationship[],
  relationshipType: WorkspacePeopleFilters["relationshipType"],
): boolean {
  if (relationshipType === "all") return true;

  return relationships.some((relationship) => {
    if (
      relationship.sourceId !== personId &&
      relationship.targetId !== personId
    ) {
      return false;
    }
    if (relationshipType === "bloodline") {
      return (
        relationship.type === "bloodline_father" ||
        relationship.type === "bloodline_mother"
      );
    }
    if (relationshipType === "social") {
      return relationship.type === "non_bloodline";
    }
    return relationship.type === relationshipType;
  });
}

export function filterWorkspacePeopleWithFilters({
  persons,
  relationships,
  addresses,
  query,
  filters,
}: FilterWorkspacePeopleInput): Person[] {
  const normalizedQuery = normalizeName(query.trim());

  return persons.filter((person) => {
    const address = addresses.get(person.id);
    if (normalizedQuery) {
      const nameMatches = normalizeName(person.displayName).includes(normalizedQuery);
      const relationMatches = address
        ? normalizeName(addressLabel(address)).includes(normalizedQuery)
        : false;
      if (!nameMatches && !relationMatches) return false;
    }

    if (filters.gender !== "all" && person.gender !== filters.gender) {
      return false;
    }
    if (
      filters.side !== "all" &&
      (address?.relation?.side ?? "none") !== filters.side
    ) {
      return false;
    }
    if (
      filters.birthYearFrom !== undefined &&
      (person.birthYear == null || person.birthYear < filters.birthYearFrom)
    ) {
      return false;
    }
    if (
      filters.birthYearTo !== undefined &&
      (person.birthYear == null || person.birthYear > filters.birthYearTo)
    ) {
      return false;
    }
    if (
      filters.lifeStatus === "living" &&
      person.deceased === true
    ) {
      return false;
    }
    if (
      filters.lifeStatus === "deceased" &&
      person.deceased !== true
    ) {
      return false;
    }
    if (
      filters.claimedStatus === "claimed" &&
      person.claimed !== true
    ) {
      return false;
    }
    if (
      filters.claimedStatus === "unclaimed" &&
      person.claimed === true
    ) {
      return false;
    }

    return matchesRelationshipType(
      person.id,
      relationships,
      filters.relationshipType,
    );
  });
}
