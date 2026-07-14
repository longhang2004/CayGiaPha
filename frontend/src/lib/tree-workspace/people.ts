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
