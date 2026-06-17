import { db } from "../db";
import { legalDocuments, userConsents } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ApiException } from "./errors";

export class ConsentService {
  async currentDocument(docType: "tos" | "privacy") {
    let doc = await db
      .select()
      .from(legalDocuments)
      .where(eq(legalDocuments.docType, docType))
      .orderBy(desc(legalDocuments.version))
      .then((rows) => rows[0]);

    if (!doc) {
      const defaultBodies = {
        tos: "Điều khoản dịch vụ (bản nháp — cần luật sư rà soát). Terms of Service (placeholder, pending legal review).",
        privacy: "Chính sách bảo mật (bản nháp — cần luật sư rà soát). Privacy Policy (placeholder, pending legal review). Categories of personal data stored, purposes of processing, data-subject rights (export/correction/erasure), and a data-protection contact point are described here."
      };
      const [newDoc] = await db
        .insert(legalDocuments)
        .values({
          docType,
          version: 1,
          body: defaultBodies[docType],
        })
        .returning();
      doc = newDoc;
    }
    return doc;
  }

  requireConsent(acceptedTos: boolean, acceptedPrivacy: boolean) {
    if (!acceptedTos) {
      throw ApiException.validation("acceptedTos", "You must accept the Terms of Service to sign up.");
    }
    if (!acceptedPrivacy) {
      throw ApiException.validation("acceptedPrivacy", "You must accept the Privacy Policy to sign up.");
    }
  }

  async recordConsent(userId: string): Promise<void> {
    await this.recordOne(userId, "tos");
    await this.recordOne(userId, "privacy");
  }

  private async recordOne(userId: string, docType: "tos" | "privacy") {
    const doc = await this.currentDocument(docType);
    await db.insert(userConsents).values({
      userId,
      docType,
      version: doc.version,
    });
  }

  async hasCurrentConsent(userId: string): Promise<boolean> {
    const tosCurrent = await this.acceptedCurrent(userId, "tos");
    const privacyCurrent = await this.acceptedCurrent(userId, "privacy");
    return tosCurrent && privacyCurrent;
  }

  private async acceptedCurrent(userId: string, docType: "tos" | "privacy"): Promise<boolean> {
    const doc = await this.currentDocument(docType);
    const latest = await db
      .select()
      .from(userConsents)
      .where(and(eq(userConsents.userId, userId), eq(userConsents.docType, docType)))
      .orderBy(desc(userConsents.version))
      .then((rows) => rows[0]);

    return latest ? latest.version >= doc.version : false;
  }

  async needsReacceptance(userId: string | null): Promise<boolean> {
    if (!userId) {
      return false;
    }
    const tosStale = await this.staleButPresent(userId, "tos");
    const privacyStale = await this.staleButPresent(userId, "privacy");
    return tosStale || privacyStale;
  }

  private async staleButPresent(userId: string, docType: "tos" | "privacy"): Promise<boolean> {
    const latest = await db
      .select()
      .from(userConsents)
      .where(and(eq(userConsents.userId, userId), eq(userConsents.docType, docType)))
      .orderBy(desc(userConsents.version))
      .then((rows) => rows[0]);

    if (!latest) {
      return false; // no record -> not blocked
    }

    const doc = await this.currentDocument(docType);
    return latest.version < doc.version;
  }
}

export const consentService = new ConsentService();
