import { db } from "../db";
import { persons, relationships, trees, claims } from "../db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { ApiException } from "./errors";
import { kinshipAddressService } from "./kinship/address";
import { claimService } from "./claim";
import { containsNormalized, normalizeName } from "../nameNormalize";
import {
  authorizationService,
  roleForPersonProjection,
  type Role,
} from "./authorization";
import {
  canExposeKinshipOrdinal,
  projectPerson,
  REDACTED_PERSON_NAME,
} from "./privacy";
import { formatKinshipDisplayTerm } from "./kinship/ordinal";

export interface SearchFilters {
  gender?: string | null;
  side?: string | null;
  birthYearMin?: number | null;
  birthYearMax?: number | null;
  deathStatus?: boolean | null;
  claimedStatus?: string | null;
  relationshipType?: string | null;
}

export interface SearchRequest {
  nameQuery?: string | null;
  addressQuery?: string | null;
  viewpointId?: string | null;
  filters?: SearchFilters | null;
}

export interface SearchResult {
  personId: string;
  displayName: string;
}

export interface SearchResponse {
  results: SearchResult[];
  noMatches: boolean;
}

const MAX_QUERY_LENGTH = 100;
const GENDERS = new Set(["male", "female"]);
const SIDES = new Set(["paternal", "maternal"]);
const CLAIMED_STATUSES = new Set(["claimed", "unclaimed"]);
const RELATIONSHIP_TYPES = new Set([
  "bloodline",
  "marriage",
  "non_bloodline",
  "asserted",
]);
const MAX_SEARCH_NODES = 1000;

interface AddressDisplayContext {
  region: string;
  livingRedaction: boolean;
  treeRole: Role;
  linkedPersonIds: ReadonlySet<string>;
  peopleById: ReadonlyMap<string, typeof persons.$inferSelect>;
}

export function relationshipTypesForFilter(relType: string): string[] {
  return relType === "bloodline"
    ? ["bloodline_father", "bloodline_mother"]
    : [relType];
}

export class SearchService {
  async search(
    treeId: string,
    request: SearchRequest,
    currentUserId: string,
  ): Promise<SearchResponse> {
    const { nameQuery, addressQuery, viewpointId, filters } = request;

    // Validate queries
    this.validateQuery("nameQuery", nameQuery);
    this.validateQuery("addressQuery", addressQuery);

    // Validate filters
    this.validateBirthYearRange(filters);
    this.validateFilterValues(filters);

    // Viewpoint validation
    const needsViewpoint = !!addressQuery || (filters && !!filters.side);
    if (needsViewpoint) {
      if (!viewpointId) {
        throw ApiException.validation(
          "viewpointId",
          "A viewpoint is required for address or side search."
        );
      }
      const viewpointExists = await db
        .select()
        .from(persons)
        .where(and(eq(persons.id, viewpointId), eq(persons.treeId, treeId)))
        .then((rows) => rows.length > 0);

      if (!viewpointExists) {
        throw ApiException.nodeNotAccessible("The selected viewpoint node is not in the tree.");
      }
    }

    const allPeople = await db
      .select()
      .from(persons)
      .where(eq(persons.treeId, treeId));
    if (allPeople.length > MAX_SEARCH_NODES) {
      throw ApiException.validation(
        "treeSize",
        "Search supports trees with up to 1,000 people.",
      );
    }

    let addressDisplayContext: AddressDisplayContext | null = null;
    if (addressQuery) {
      const tree = await db
        .select()
        .from(trees)
        .where(eq(trees.id, treeId))
        .then((rows) => rows[0]);
      const treeRole = await authorizationService.classify(
        currentUserId,
        treeId,
        null,
      );
      addressDisplayContext = {
        region: tree?.region ?? "Bac",
        livingRedaction: tree?.livingRedaction ?? true,
        treeRole,
        linkedPersonIds: await authorizationService.linkedPersonIds(
          currentUserId,
          treeId,
        ),
        peopleById: new Map(allPeople.map((person) => [person.id, person])),
      };
    }

    const results: SearchResult[] = [];
    for (const person of allPeople) {
      // Name search
      if (nameQuery && !containsNormalized(person.displayName, nameQuery)) {
        continue;
      }

      // Address search
      if (addressQuery) {
        const matchesAddress = await this.addressMatches(
          treeId,
          viewpointId!,
          person.id,
          addressQuery,
          addressDisplayContext!,
        );
        if (!matchesAddress) {
          continue;
        }
      }

      // Filters
      if (filters) {
        const matchesF = await this.matchesFilters(treeId, viewpointId || null, person, filters);
        if (!matchesF) {
          continue;
        }
      }

      results.push({ personId: person.id, displayName: person.displayName });
    }

    // Redact results
    return this.redact(
      treeId,
      { results, noMatches: results.length === 0 },
      !!nameQuery,
      currentUserId,
    );
  }

  private async redact(
    treeId: string,
    response: SearchResponse,
    nameSearchUsed: boolean,
    currentUserId: string,
  ): Promise<SearchResponse> {
    const tree = await db
      .select()
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);

    const livingRedaction = tree ? tree.livingRedaction : true;
    const out: SearchResult[] = [];

    const allPeople = await db
      .select()
      .from(persons)
      .where(eq(persons.treeId, treeId));

    const peopleMap = new Map<string, typeof allPeople[0]>();
    for (const p of allPeople) {
      peopleMap.set(p.id, p);
    }

    for (const result of response.results) {
      const person = peopleMap.get(result.personId);
      if (!person) continue;

      const role = await authorizationService.classify(
        currentUserId,
        treeId,
        result.personId
      );
      const projected = projectPerson(person, { role, livingRedaction });
      if (projected.displayName === REDACTED_PERSON_NAME) {
        if (nameSearchUsed) {
          continue; // Hidden name must not be discoverable by name search
        }
        out.push({
          personId: result.personId,
          displayName: REDACTED_PERSON_NAME,
        });
      } else {
        out.push({ personId: result.personId, displayName: projected.displayName });
      }
    }

    return { results: out, noMatches: out.length === 0 };
  }

  private async matchesFilters(
    treeId: string,
    viewpointId: string | null,
    person: typeof persons.$inferSelect,
    filters: SearchFilters
  ): Promise<boolean> {
    if (filters.gender && !this.matchesGender(person, filters.gender)) {
      return false;
    }
    if (filters.side && viewpointId) {
      const matchesS = await this.matchesSide(treeId, viewpointId, person.id, filters.side);
      if (!matchesS) {
        return false;
      }
    }
    if (
      (filters.birthYearMin !== undefined || filters.birthYearMax !== undefined) &&
      !this.matchesBirthYearRange(person, filters.birthYearMin, filters.birthYearMax)
    ) {
      return false;
    }
    if (filters.deathStatus !== undefined && filters.deathStatus !== null) {
      if (person.deathStatus !== filters.deathStatus) {
        return false;
      }
    }
    if (filters.claimedStatus) {
      const matchesC = await this.matchesClaimedStatus(person.id, filters.claimedStatus);
      if (!matchesC) {
        return false;
      }
    }
    if (filters.relationshipType) {
      const matchesR = await this.matchesRelationshipType(treeId, person.id, filters.relationshipType);
      if (!matchesR) {
        return false;
      }
    }

    return true;
  }

  private matchesGender(person: typeof persons.$inferSelect, gender: string): boolean {
    return !!person.gender && person.gender.toLowerCase() === gender.trim().toLowerCase();
  }

  private async matchesSide(
    treeId: string,
    viewpointId: string,
    personId: string,
    side: string
  ): Promise<boolean> {
    const derived = await kinshipAddressService.resolveDerivedAddress(treeId, viewpointId, personId);
    if (derived.status !== "RESOLVED" || !derived.relation) {
      return false;
    }
    const actual = derived.relation.side.toLowerCase();
    return actual === side.toLowerCase();
  }

  private matchesBirthYearRange(
    person: typeof persons.$inferSelect,
    min?: number | null,
    max?: number | null
  ): boolean {
    if (min === undefined && max === undefined) return true;
    if (min === null && max === null) return true;

    const birthYear = person.birthYear;
    if (birthYear === null || birthYear === undefined) {
      return false;
    }
    if (min !== undefined && min !== null && birthYear < min) {
      return false;
    }
    if (max !== undefined && max !== null && birthYear > max) {
      return false;
    }
    return true;
  }

  private async matchesClaimedStatus(personId: string, status: string): Promise<boolean> {
    const isClaimed = await claimService.isClaimed(personId);
    return status === "claimed" ? isClaimed : !isClaimed;
  }

  private async matchesRelationshipType(
    treeId: string,
    personId: string,
    relType: string,
  ): Promise<boolean> {
    const types = relationshipTypesForFilter(relType);
    const rows = await db
      .select({ id: relationships.id })
      .from(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          inArray(relationships.type, types),
          or(
            eq(relationships.sourceId, personId),
            eq(relationships.targetId, personId)
          )
        )
      );
    return rows.length > 0;
  }

  private async addressMatches(
    treeId: string,
    viewpointId: string,
    targetId: string,
    addressQuery: string,
    context: AddressDisplayContext,
  ): Promise<boolean> {
    const res = await kinshipAddressService.resolveAddress(treeId, viewpointId, targetId);
    if (res.status !== "RESOLVED" || !res.term) {
      return false;
    }

    const normalizedQuery = normalizeName(addressQuery.trim());
    if (normalizeName(res.term) === normalizedQuery) {
      return true;
    }

    const ordinalSource = res.ordinalContext
      ? context.peopleById.get(res.ordinalContext.sourcePersonId)
      : undefined;
    const canExposeOrdinal = ordinalSource
      ? canExposeKinshipOrdinal(ordinalSource, {
          role: roleForPersonProjection(
            context.treeRole,
            context.linkedPersonIds,
            ordinalSource.id,
          ),
          livingRedaction: context.livingRedaction,
        })
      : false;
    const displayTerm = formatKinshipDisplayTerm({
      baseTerm: res.term,
      region: context.region,
      ordinalContext: res.ordinalContext,
      canExposeOrdinal,
    });
    return normalizeName(displayTerm) === normalizedQuery;
  }

  private validateQuery(field: string, query?: string | null) {
    if (!query) return;
    if (query.length === 0) {
      throw ApiException.validation(field, "Search query must not be empty.");
    }
    if (query.length > MAX_QUERY_LENGTH) {
      throw ApiException.validation(
        field,
        `Search query must be at most ${MAX_QUERY_LENGTH} characters.`
      );
    }
  }

  private validateBirthYearRange(filters?: SearchFilters | null) {
    if (!filters) return;
    const { birthYearMin, birthYearMax } = filters;
    if (
      birthYearMin !== undefined &&
      birthYearMin !== null &&
      birthYearMax !== undefined &&
      birthYearMax !== null &&
      birthYearMin > birthYearMax
    ) {
      throw ApiException.validation(
        "birthYearRange",
        "The birth-year range lower bound must not exceed its upper bound."
      );
    }
  }

  private validateFilterValues(filters?: SearchFilters | null) {
    if (!filters) return;
    this.validateEnum("gender", filters.gender, GENDERS, true);
    this.validateEnum("side", filters.side, SIDES, false);
    this.validateEnum("claimedStatus", filters.claimedStatus, CLAIMED_STATUSES, false);
    this.validateEnum("relationshipType", filters.relationshipType, RELATIONSHIP_TYPES, false);
  }

  private validateEnum(
    field: string,
    value: string | null | undefined,
    allowed: Set<String>,
    caseInsensitive: boolean
  ) {
    if (!value) return;
    const candidate = caseInsensitive ? value.trim().toLowerCase() : value;
    if (!allowed.has(candidate)) {
      throw ApiException.validation(field, `Unsupported value for filter '${field}': ${value}`);
    }
  }

}

export const searchService = new SearchService();
