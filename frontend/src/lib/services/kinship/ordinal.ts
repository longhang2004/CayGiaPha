import type { KinshipOrdinalContext } from "./resolver";

interface FormatKinshipDisplayTermInput {
  baseTerm: string;
  region: string;
  ordinalContext: KinshipOrdinalContext | null;
  canExposeOrdinal: boolean;
}

const DIGIT_NAMES = [
  "Không",
  "Một",
  "Hai",
  "Ba",
  "Tư",
  "Năm",
  "Sáu",
  "Bảy",
  "Tám",
  "Chín",
] as const;

function formatCallingNumber(value: number): string | null {
  if (!Number.isInteger(value) || value < 2 || value > 100) {
    return null;
  }
  if (value === 100) {
    return "Một Trăm";
  }
  if (value < 10) {
    return DIGIT_NAMES[value];
  }

  const tens = Math.floor(value / 10);
  const units = value % 10;
  const prefix = tens === 1 ? "Mười" : `${DIGIT_NAMES[tens]} Mươi`;
  if (units === 0) {
    return prefix;
  }

  let unitName: string = DIGIT_NAMES[units];
  if (units === 1 && tens > 1) {
    unitName = "Mốt";
  } else if (units === 5) {
    unitName = "Lăm";
  }
  return `${prefix} ${unitName}`;
}

export function formatKinshipDisplayTerm({
  baseTerm,
  region,
  ordinalContext,
  canExposeOrdinal,
}: FormatKinshipDisplayTermInput): string {
  if (region !== "Nam" || !ordinalContext || !canExposeOrdinal) {
    return baseTerm;
  }

  const callingNumber = formatCallingNumber(ordinalContext.birthOrder + 1);
  return callingNumber ? `${baseTerm} ${callingNumber}` : baseTerm;
}
