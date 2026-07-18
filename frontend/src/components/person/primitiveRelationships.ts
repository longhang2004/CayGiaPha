import type { Gender, MaritalStatus } from "@/lib/persons";

export type PrimitiveRelationshipIntent =
  | "father"
  | "mother"
  | "son"
  | "daughter"
  | "wife"
  | "husband";

type PrimitiveRelationshipType =
  | "bloodline_father"
  | "bloodline_mother"
  | "marriage";

interface PersonReference {
  id: string;
  gender?: Gender;
}

export interface NewPersonRelationshipMapping {
  type: PrimitiveRelationshipType;
  existingPersonId: string;
  newPersonPosition: "source" | "target";
  gender: Gender;
  maritalStatus?: MaritalStatus;
}

export interface ExistingPersonRelationshipMapping {
  type: PrimitiveRelationshipType;
  sourceId: string;
  targetId: string;
  expectedGender: Gender;
  maritalStatus?: MaritalStatus;
}

function parentType(person: PersonReference): PrimitiveRelationshipType {
  return person.gender === "female"
    ? "bloodline_mother"
    : "bloodline_father";
}

export function mapNewPersonRelationship(
  intent: PrimitiveRelationshipIntent,
  anchor: PersonReference,
): NewPersonRelationshipMapping {
  if (intent === "father") {
    return {
      type: "bloodline_father",
      existingPersonId: anchor.id,
      newPersonPosition: "source",
      gender: "male",
    };
  }
  if (intent === "mother") {
    return {
      type: "bloodline_mother",
      existingPersonId: anchor.id,
      newPersonPosition: "source",
      gender: "female",
    };
  }
  if (intent === "son" || intent === "daughter") {
    return {
      type: parentType(anchor),
      existingPersonId: anchor.id,
      newPersonPosition: "target",
      gender: intent === "son" ? "male" : "female",
    };
  }

  return {
    type: "marriage",
    existingPersonId: anchor.id,
    newPersonPosition: "target",
    gender: intent === "wife" ? "female" : "male",
    maritalStatus: "married",
  };
}

export function mapExistingPersonRelationship(
  intent: PrimitiveRelationshipIntent,
  anchor: PersonReference,
  relatedPerson: Pick<PersonReference, "id">,
): ExistingPersonRelationshipMapping {
  if (intent === "father" || intent === "mother") {
    return {
      type: intent === "father" ? "bloodline_father" : "bloodline_mother",
      sourceId: relatedPerson.id,
      targetId: anchor.id,
      expectedGender: intent === "father" ? "male" : "female",
    };
  }
  if (intent === "son" || intent === "daughter") {
    return {
      type: parentType(anchor),
      sourceId: anchor.id,
      targetId: relatedPerson.id,
      expectedGender: intent === "son" ? "male" : "female",
    };
  }

  return {
    type: "marriage",
    sourceId: anchor.id,
    targetId: relatedPerson.id,
    expectedGender: intent === "wife" ? "female" : "male",
    maritalStatus: "married",
  };
}
