import { db } from "../db";
import { persons } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { ApiException } from "./errors";

export interface CreatePersonRequest {
  treeId: string;
  displayName: string;
  gender: string;
  birthOrder?: number | null;
  birthYear?: number | null;
  deathStatus?: boolean | null;
}

export interface EditPersonRequest {
  displayName?: string | null;
  gender?: string | null;
  birthOrder?: number | null;
  birthYear?: number | null;
  deathStatus?: boolean | null;
}

export interface VisibilityUpdateRequest {
  visMarital?: string | null;
  visAdoption?: string | null;
  visDeath?: string | null;
  visName?: string | null;
  visBirthYear?: string | null;
  visPhoto?: string | null;
}

const NAME_MIN = 1;
const NAME_MAX = 100;
const BIRTH_ORDER_MIN = 1;
const BIRTH_ORDER_MAX = 99;
const BIRTH_YEAR_MIN = 1000;
const GENDERS = new Set(["male", "female"]);
const VISIBILITY_VALUES = new Set(["private", "public"]);

export class PersonService {
  async create(request: CreatePersonRequest): Promise<string> {
    if (!request.treeId) {
      throw ApiException.validation("treeId", "Tree id is required.");
    }

    this.validateDisplayName(request.displayName);
    this.validateGender(request.gender);
    this.validateBirthOrder(request.birthOrder);
    this.validateBirthYear(request.birthYear);

    const [saved] = await db
      .insert(persons)
      .values({
        treeId: request.treeId,
        displayName: request.displayName,
        gender: request.gender,
        birthOrder: request.birthOrder || null,
        birthYear: request.birthYear || null,
        deathStatus: request.deathStatus || false,
        adoptionStatus: false, // default
        visMarital: "private",
        visAdoption: "private",
        visDeath: "private",
        visName: "public",
        visBirthYear: "public",
        visPhoto: "private",
      })
      .returning();

    return saved.id;
  }

  async edit(treeId: string, personId: string, request: EditPersonRequest): Promise<typeof persons.$inferSelect> {
    const person = await this.requirePerson(treeId, personId);

    // Validate edits first
    if (request.displayName !== undefined && request.displayName !== null) {
      this.validateDisplayName(request.displayName);
    }
    if (request.gender !== undefined && request.gender !== null) {
      this.validateGender(request.gender);
    }
    if (request.birthOrder !== undefined) {
      this.validateBirthOrder(request.birthOrder);
    }
    if (request.birthYear !== undefined) {
      this.validateBirthYear(request.birthYear);
    }

    // Apply edits
    const updates: Partial<typeof persons.$inferInsert> = {};
    if (request.displayName !== undefined) updates.displayName = request.displayName || undefined;
    if (request.gender !== undefined) updates.gender = request.gender || undefined;
    if (request.birthOrder !== undefined) updates.birthOrder = request.birthOrder;
    if (request.birthYear !== undefined) updates.birthYear = request.birthYear;
    if (request.deathStatus !== undefined) updates.deathStatus = request.deathStatus || false;

    const [updated] = await db
      .update(persons)
      .set(updates)
      .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)))
      .returning();

    return updated;
  }

  async setVisibility(
    treeId: string,
    personId: string,
    request: VisibilityUpdateRequest
  ): Promise<typeof persons.$inferSelect> {
    await this.requirePerson(treeId, personId);

    // Validate settings
    this.validateVisibility("visMarital", request.visMarital);
    this.validateVisibility("visAdoption", request.visAdoption);
    this.validateVisibility("visDeath", request.visDeath);
    this.validateVisibility("visName", request.visName);
    this.validateVisibility("visBirthYear", request.visBirthYear);
    this.validateVisibility("visPhoto", request.visPhoto);

    // Apply updates
    const updates: Partial<typeof persons.$inferInsert> = {};
    if (request.visMarital !== undefined && request.visMarital !== null) updates.visMarital = request.visMarital;
    if (request.visAdoption !== undefined && request.visAdoption !== null) updates.visAdoption = request.visAdoption;
    if (request.visDeath !== undefined && request.visDeath !== null) updates.visDeath = request.visDeath;
    if (request.visName !== undefined && request.visName !== null) updates.visName = request.visName;
    if (request.visBirthYear !== undefined && request.visBirthYear !== null) updates.visBirthYear = request.visBirthYear;
    if (request.visPhoto !== undefined && request.visPhoto !== null) updates.visPhoto = request.visPhoto;

    const [updated] = await db
      .update(persons)
      .set(updates)
      .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)))
      .returning();

    return updated;
  }

  async read(treeId: string, personId: string): Promise<typeof persons.$inferSelect> {
    return this.requirePerson(treeId, personId);
  }

  private async requirePerson(treeId: string, personId: string) {
    if (!treeId || !personId) {
      throw ApiException.nodeNotAccessible("The target node is not accessible.");
    }
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

  private validateDisplayName(displayName: string) {
    if (!displayName || displayName.length < NAME_MIN || displayName.length > NAME_MAX) {
      throw ApiException.validation("displayName", "Display name must be 1 to 100 characters.");
    }
  }

  private validateGender(gender: string) {
    if (!gender || !GENDERS.has(gender)) {
      throw ApiException.validation("gender", "Gender must be one of {male, female}.");
    }
  }

  private validateBirthOrder(birthOrder?: number | null) {
    if (birthOrder !== undefined && birthOrder !== null && (birthOrder < BIRTH_ORDER_MIN || birthOrder > BIRTH_ORDER_MAX)) {
      throw ApiException.validation("birthOrder", "Birth order must be between 1 and 99.");
    }
  }

  private validateBirthYear(birthYear?: number | null) {
    if (birthYear !== undefined && birthYear !== null) {
      const currentYear = new Date().getUTCFullYear();
      if (birthYear < BIRTH_YEAR_MIN || birthYear > currentYear) {
        throw ApiException.validation(
          "birthYear",
          "Birth year must be between 1000 and the current year."
        );
      }
    }
  }

  private validateVisibility(field: string, value?: string | null) {
    if (value !== undefined && value !== null && !VISIBILITY_VALUES.has(value)) {
      throw ApiException.validation(field, "Visibility must be one of {private, public}.");
    }
  }
}

export const personService = new PersonService();
