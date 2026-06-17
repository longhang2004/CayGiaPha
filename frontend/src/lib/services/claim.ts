import { db } from "../db";
import { claims, persons, users } from "../db/schema";
import { eq, and, or } from "drizzle-orm";
import { ApiException } from "./errors";
import { identifierValidator, verificationCodeService } from "./auth";

export class ClaimService {
  async invite(treeId: string, personId: string, destination: string): Promise<void> {
    await this.requirePerson(treeId, personId);
    identifierValidator.requireValid("destination", destination);

    const isClaimed = await this.isClaimed(personId);
    if (isClaimed) {
      throw ApiException.alreadyClaimed("This node has already been claimed.");
    }

    // Issue claim code
    await verificationCodeService.issueForNode(personId, destination);
  }

  async verifyClaim(
    treeId: string,
    personId: string,
    identifier: string,
    code: string
  ): Promise<typeof claims.$inferSelect> {
    await this.requirePerson(treeId, personId);

    const isAlreadyClaimed = await this.isClaimed(personId);
    if (isAlreadyClaimed) {
      throw ApiException.alreadyClaimed("This node has already been claimed.");
    }

    const type = identifierValidator.requireValid("identifier", identifier);
    const recipient = await db
      .select()
      .from(users)
      .where(
        type === "PHONE" ? eq(users.phone, identifier) : eq(users.email, identifier)
      )
      .then((rows) => rows[0]);

    if (!recipient || !recipient.verified) {
      throw ApiException.accountNotFound("No verified account was found for the provided identifier.");
    }

    // Verify OTP
    await verificationCodeService.verifyForNode(personId, code);

    // Save claim link
    const [saved] = await db
      .insert(claims)
      .values({
        personId,
        userId: recipient.id,
      })
      .returning();

    return saved;
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
    const rows = await db.select().from(claims).where(eq(claims.personId, personId));
    return rows.length > 0;
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

  private async requirePerson(treeId: string, personId: string) {
    const person = await db
      .select()
      .from(persons)
      .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)))
      .then((rows) => rows[0]);

    if (!person) {
      throw ApiException.nodeNotAccessible("The target node is not accessible.");
    }
    return person;
  }
}

export const claimService = new ClaimService();
