import type { Role } from "./authorization";

export const REDACTED_PERSON_NAME = "Người thân còn sống";

export interface PrivacyPerson {
  id: string;
  treeId: string;
  displayName: string;
  gender: string;
  birthOrder: number | null;
  birthYear: number | null;
  phone: string | null;
  email: string | null;
  deathStatus: boolean;
  deathDay: number | null;
  deathMonth: number | null;
  deathYear: number | null;
  deathCalendar: string | null;
  deathLunarLeap: boolean | null;
  adoptionStatus: boolean | null;
  visMarital: string;
  visAdoption: string;
  visDeath: string;
  visName: string;
  visBirthYear: string;
  visPhoto: string;
}

export interface PersonProjection {
  id: string;
  treeId: string;
  displayName: string;
  gender: string;
  birthOrder?: number | null;
  birthYear?: number | null;
  phone?: string | null;
  email?: string | null;
  deathStatus?: boolean;
  deathDay?: number | null;
  deathMonth?: number | null;
  deathYear?: number | null;
  deathCalendar?: string | null;
  deathLunarLeap?: boolean | null;
  adoptionStatus?: boolean | null;
  visMarital?: string;
  visAdoption?: string;
  visDeath?: string;
  visName?: string;
  visBirthYear?: string;
  visPhoto?: string;
}

export function isLivingPerson(
  person: Pick<PrivacyPerson, "birthYear" | "deathStatus">,
  currentYear = new Date().getUTCFullYear(),
): boolean {
  if (person.deathStatus) return false;
  if (person.birthYear === null || person.birthYear === undefined) return true;
  return person.birthYear >= currentYear - 100;
}

export function isTrustedPersonRole(role: Role): boolean {
  return role === "OWNER" || role === "CONTRIBUTOR" || role === "LINKED";
}

export function canViewGovernedField(role: Role, visibility: string): boolean {
  return isTrustedPersonRole(role) || visibility === "public";
}

export function projectPerson(
  person: PrivacyPerson,
  options: {
    role: Role;
    livingRedaction: boolean;
    currentYear?: number;
  },
): PersonProjection {
  const trusted = isTrustedPersonRole(options.role);
  const livingRedacted =
    !trusted &&
    options.livingRedaction &&
    isLivingPerson(person, options.currentYear);
  const nameVisible = canViewGovernedField(options.role, person.visName);
  const birthYearVisible = canViewGovernedField(options.role, person.visBirthYear);
  const deathVisible = canViewGovernedField(options.role, person.visDeath);
  const adoptionVisible = canViewGovernedField(options.role, person.visAdoption);

  const projected: PersonProjection = {
    id: person.id,
    treeId: person.treeId,
    displayName: nameVisible ? person.displayName : REDACTED_PERSON_NAME,
    gender: person.gender,
  };

  if (!livingRedacted || trusted) projected.birthOrder = person.birthOrder;
  if (birthYearVisible) projected.birthYear = person.birthYear;
  if (trusted) {
    projected.phone = person.phone;
    projected.email = person.email;
  }
  if (deathVisible) {
    projected.deathStatus = person.deathStatus;
    projected.deathDay = person.deathDay;
    projected.deathMonth = person.deathMonth;
    projected.deathYear = person.deathYear;
    projected.deathCalendar = person.deathCalendar;
    projected.deathLunarLeap = person.deathLunarLeap;
  }
  if (adoptionVisible) projected.adoptionStatus = person.adoptionStatus;
  if (trusted) {
    projected.visMarital = person.visMarital;
    projected.visAdoption = person.visAdoption;
    projected.visDeath = person.visDeath;
    projected.visName = person.visName;
    projected.visBirthYear = person.visBirthYear;
    projected.visPhoto = person.visPhoto;
  }

  return projected;
}

export function canViewPrimaryPhoto(person: PrivacyPerson, role: Role): boolean {
  return canViewGovernedField(role, person.visPhoto);
}

export function canViewMaritalStatus(
  source: PrivacyPerson,
  sourceRole: Role,
  target: PrivacyPerson,
  targetRole: Role,
): boolean {
  return (
    canViewGovernedField(sourceRole, source.visMarital) &&
    canViewGovernedField(targetRole, target.visMarital)
  );
}
