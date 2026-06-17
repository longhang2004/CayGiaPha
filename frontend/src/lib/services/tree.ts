import { db } from "../db";
import { trees, treeShareTokens } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { ApiException } from "./errors";
import crypto from "crypto";

const VALID_REGIONS = new Set(["Bac", "Trung", "Nam"]);
const VALID_SHARING = new Set(["private", "link", "public"]);

export class TreeService {
  async changeRegion(treeId: string, region: string): Promise<typeof trees.$inferSelect> {
    const tree = await this.requireTree(treeId);

    if (!region || !VALID_REGIONS.has(region)) {
      throw ApiException.validation("region", "Region must be one of Bac, Trung, or Nam.");
    }

    const [updated] = await db
      .update(trees)
      .set({ region })
      .where(eq(trees.id, treeId))
      .returning();

    return updated;
  }

  async changeSharing(treeId: string, sharing: string): Promise<typeof trees.$inferSelect> {
    const tree = await this.requireTree(treeId);

    if (!sharing || !VALID_SHARING.has(sharing)) {
      throw ApiException.validation("sharing", "Sharing must be one of private, link, or public.");
    }

    const [updated] = await db
      .update(trees)
      .set({ sharing })
      .where(eq(trees.id, treeId))
      .returning();

    return updated;
  }

  async issueShareToken(treeId: string): Promise<string> {
    await this.requireTree(treeId);

    // Revoke prior active tokens
    await db
      .update(treeShareTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(treeShareTokens.treeId, treeId),
          isNull(treeShareTokens.revokedAt)
        )
      );

    // Generate high-entropy token (32 bytes url-safe base64 without padding)
    const raw = crypto.randomBytes(32);
    const token = raw.toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await db.insert(treeShareTokens).values({
      treeId,
      tokenHash,
    });

    return token;
  }

  async revokeShareToken(treeId: string): Promise<void> {
    await this.requireTree(treeId);

    await db
      .update(treeShareTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(treeShareTokens.treeId, treeId),
          isNull(treeShareTokens.revokedAt)
        )
      );
  }

  async setLivingRedaction(treeId: string, enabled: boolean): Promise<typeof trees.$inferSelect> {
    const tree = await this.requireTree(treeId);

    const [updated] = await db
      .update(trees)
      .set({ livingRedaction: enabled })
      .where(eq(trees.id, treeId))
      .returning();

    return updated;
  }

  private async requireTree(treeId: string) {
    if (!treeId) {
      throw ApiException.nodeNotAccessible("The specified tree was not found.");
    }
    const tree = await db
      .select()
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);

    if (!tree) {
      throw ApiException.nodeNotAccessible("The specified tree was not found.");
    }
    return tree;
  }
}

export const treeService = new TreeService();
