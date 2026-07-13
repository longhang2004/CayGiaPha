import { db } from "../db";
import { claims, persons, users } from "../db/schema";
import { and, eq, or } from "drizzle-orm";
import { ApiException } from "./errors";
import {
  identifierValidator,
  normalizeIdentifierIdentity,
  verificationCodeService,
} from "./auth";

type ClaimPerson = Pick<typeof persons.$inferSelect, "id" | "treeId">;
type ClaimUser = Pick<typeof users.$inferSelect, "id" | "email" | "phone" | "verified">;
type ClaimRecord = typeof claims.$inferSelect;

export interface ClaimServiceDependencies {
  findPerson(personId: string, treeId?: string): Promise<ClaimPerson | null>;
  hasClaim(personId: string): Promise<boolean>;
  findUserById(userId: string): Promise<ClaimUser | null>;
  findVerifiedLegacyPhone(phone: string): Promise<boolean>;
  issueCode(personId: string, destination: string): Promise<unknown>;
  verifyCode(
    personId: string,
    code: string,
    expectedDestinations: string[],
  ): Promise<void>;
  saveClaim(personId: string, userId: string): Promise<ClaimRecord>;
}

const defaultDependencies: ClaimServiceDependencies = {
  async findPerson(personId, treeId) {
    const condition = treeId
      ? and(eq(persons.id, personId), eq(persons.treeId, treeId))
      : eq(persons.id, personId);
    return db
      .select({ id: persons.id, treeId: persons.treeId })
      .from(persons)
      .where(condition)
      .then((rows) => rows[0] ?? null);
  },
  async hasClaim(personId) {
    return db
      .select({ id: claims.id })
      .from(claims)
      .where(eq(claims.personId, personId))
      .then((rows) => rows.length > 0);
  },
  async findUserById(userId) {
    return db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        verified: users.verified,
      })
      .from(users)
      .where(eq(users.id, userId))
      .then((rows) => rows[0] ?? null);
  },
  async findVerifiedLegacyPhone(phone) {
    const canonical = normalizeIdentifierIdentity(phone);
    const local = canonical.startsWith("84") ? `0${canonical.slice(2)}` : phone;
    const international = canonical.startsWith("84") ? `+${canonical}` : phone;
    return db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.verified, true),
          or(eq(users.phone, phone), eq(users.phone, local), eq(users.phone, international)),
        ),
      )
      .then((rows) => rows.length > 0);
  },
  issueCode(personId, destination) {
    return verificationCodeService.issueForNode(personId, destination);
  },
  verifyCode(personId, code, expectedDestinations) {
    return verificationCodeService.verifyForNode(personId, code, expectedDestinations);
  },
  async saveClaim(personId, userId) {
    const [saved] = await db.insert(claims).values({ personId, userId }).returning();
    return saved;
  },
};

export class ClaimService {
  constructor(private readonly dependencies: ClaimServiceDependencies = defaultDependencies) {}

  async invite(treeId: string, personId: string, destination: string): Promise<void> {
    await this.requirePerson(personId, treeId);
    const trimmedDestination = destination?.trim();
    const type = identifierValidator.requireValid("destination", trimmedDestination);

    if (await this.dependencies.hasClaim(personId)) {
      throw ApiException.alreadyClaimed("This node has already been claimed.");
    }
    if (
      type === "PHONE" &&
      !(await this.dependencies.findVerifiedLegacyPhone(trimmedDestination))
    ) {
      throw ApiException.accountNotFound(
        "Phone invitations are only available for verified legacy accounts.",
      );
    }

    const normalizedDestination =
      type === "EMAIL" ? trimmedDestination.toLowerCase() : trimmedDestination;
    await this.dependencies.issueCode(personId, normalizedDestination);
  }

  async verifyClaim(
    personId: string,
    currentUserId: string,
    code: string,
  ): Promise<{ claim: ClaimRecord; treeId: string }> {
    const person = await this.requirePerson(personId);
    if (await this.dependencies.hasClaim(personId)) {
      throw ApiException.alreadyClaimed("This node has already been claimed.");
    }

    const recipient = await this.dependencies.findUserById(currentUserId);
    if (!recipient?.verified) {
      throw ApiException.accountNotFound("A verified account is required to claim this person.");
    }

    const expectedDestinations = [recipient.email, recipient.phone]
      .filter((value): value is string => !!value)
      .map(normalizeIdentifierIdentity);
    if (expectedDestinations.length === 0) {
      throw ApiException.accountNotFound("A verified account identity is required to claim this person.");
    }

    await this.dependencies.verifyCode(personId, code, expectedDestinations);
    const claim = await this.dependencies.saveClaim(personId, currentUserId);
    return { claim, treeId: person.treeId };
  }

  async isLinkedUser(personId: string | null, userId: string | null): Promise<boolean> {
    if (!personId || !userId) return false;
    const rows = await db
      .select()
      .from(claims)
      .where(and(eq(claims.personId, personId), eq(claims.userId, userId)));
    return rows.length > 0;
  }

  async isClaimed(personId: string | null): Promise<boolean> {
    if (!personId) return false;
    return this.dependencies.hasClaim(personId);
  }

  async isLinkedToTree(treeId: string | null, userId: string | null): Promise<boolean> {
    if (!treeId || !userId) return false;
    const rows = await db
      .select({ id: claims.id })
      .from(claims)
      .innerJoin(persons, eq(claims.personId, persons.id))
      .where(and(eq(persons.treeId, treeId), eq(claims.userId, userId)));
    return rows.length > 0;
  }

  private async requirePerson(personId: string, treeId?: string): Promise<ClaimPerson> {
    if (!personId || (treeId !== undefined && !treeId)) {
      throw ApiException.nodeNotAccessible("The target node is not accessible.");
    }
    const person = await this.dependencies.findPerson(personId, treeId);
    if (!person) {
      throw ApiException.nodeNotAccessible("The target node is not accessible.");
    }
    return person;
  }
}

export const claimService = new ClaimService();
