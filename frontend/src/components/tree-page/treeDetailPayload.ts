import type {
  Capabilities,
  Person,
  Relationship,
  TreeAccessRole,
} from "@/lib/graph";
import type { Region } from "@/lib/region";

const TREE_ACCESS_ROLES = new Set<TreeAccessRole>([
  "OWNER",
  "CONTRIBUTOR",
  "LINKED",
  "READER",
  "NONE",
]);

const REGIONS = new Set<Region>(["Bac", "Trung", "Nam"]);

const RELATIONSHIP_TYPES = new Set([
  "bloodline_father",
  "bloodline_mother",
  "marriage",
  "non_bloodline",
  "asserted",
]);

const DERIVATION_STATES = new Set(["derived", "asserted", "verified", "conflict"]);

export interface TreeDetailPayload {
  persons: Person[];
  relationships: Relationship[];
  region: Region;
  livingRedaction: boolean;
  sharing: string;
  name: string;
  accessRole: TreeAccessRole;
  capabilities: Capabilities;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error("Invalid tree detail response");
  }
  return value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function normalizePerson(person: Record<string, unknown>): Person {
  if (!isNonEmptyString(person.id) || !isNonEmptyString(person.displayName)) {
    throw new Error("Invalid tree detail response");
  }
  return {
    ...person,
    capabilities: normalizeCapabilities(person.capabilities),
  } as unknown as Person;
}

function normalizeRelationship(relationship: Record<string, unknown>): Relationship {
  if (
    !isNonEmptyString(relationship.id) ||
    !isNonEmptyString(relationship.sourceId) ||
    !isNonEmptyString(relationship.targetId) ||
    !isNonEmptyString(relationship.type) ||
    !RELATIONSHIP_TYPES.has(relationship.type) ||
    !isNonEmptyString(relationship.derivationState) ||
    !DERIVATION_STATES.has(relationship.derivationState)
  ) {
    throw new Error("Invalid tree detail response");
  }
  return relationship as unknown as Relationship;
}

/**
 * Treat the API payload as untrusted. Only an explicit boolean true grants a
 * client-visible action; absent, partial, or malformed capability data fails closed.
 */
export function normalizeCapabilities(value: unknown): Capabilities {
  const source = isRecord(value) ? value : {};
  return {
    editContent: source.editContent === true,
    editRelationships: source.editRelationships === true,
    editPhotos: source.editPhotos === true,
    editVisibility: source.editVisibility === true,
    manageClaim: source.manageClaim === true,
    manageTree: source.manageTree === true,
    manageCollaboration: source.manageCollaboration === true,
  };
}

export function normalizeTreeDetailPayload(value: unknown): TreeDetailPayload {
  if (!isRecord(value)) {
    throw new Error("Invalid tree detail response");
  }

  const rawPersons = requireRecordArray(value.persons);
  const rawRelationships = requireRecordArray(value.relationships);
  const accessRole = typeof value.accessRole === "string" &&
    TREE_ACCESS_ROLES.has(value.accessRole as TreeAccessRole)
    ? value.accessRole as TreeAccessRole
    : "NONE";
  const region = typeof value.region === "string" && REGIONS.has(value.region as Region)
    ? value.region as Region
    : "Bac";

  return {
    persons: rawPersons.map(normalizePerson),
    relationships: rawRelationships.map(normalizeRelationship),
    region,
    livingRedaction: typeof value.livingRedaction === "boolean"
      ? value.livingRedaction
      : true,
    sharing: typeof value.sharing === "string" && value.sharing.length > 0
      ? value.sharing
      : "private",
    name: typeof value.name === "string" && value.name.length > 0
      ? value.name
      : "Cây Gia Phả",
    accessRole,
    capabilities: normalizeCapabilities(value.capabilities),
  };
}
