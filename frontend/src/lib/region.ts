/**
 * Region (regional dialect) setting API helper (task 10.4).
 *
 * Wraps PATCH /trees/{treeId}/region (design "Kinship_Resolver" region change,
 * Requirements 9.5–9.6). The region is stored ASCII-keyed (`Bac`/`Trung`/`Nam`)
 * but displayed with diacritics (Bắc/Trung/Nam — design Data Models note).
 *
 * Changing the region affects every Form_Of_Address computed afterwards (9.5);
 * an invalid value is rejected and the previous region retained (9.6). Errors
 * propagate as the typed {@link ApiError} for field-level reporting.
 */

import { api } from "./apiClient";

/** The three valid region values, stored ASCII-keyed (design Data Models). */
export type Region = "Bac" | "Trung" | "Nam";

/** Ordered region options with their display labels (Bắc/Trung/Nam). */
export const REGION_OPTIONS: ReadonlyArray<{ value: Region; label: string }> = [
  { value: "Bac", label: "Phổ thông (miền Bắc)" },
  { value: "Trung", label: "Miền Trung" },
  { value: "Nam", label: "Miền Nam" },
];

/** The valid region values as a set, for validation. */
export const REGIONS: ReadonlyArray<Region> = REGION_OPTIONS.map((o) => o.value);

/** Type guard: is the value one of the three accepted regions? */
export function isRegion(value: string): value is Region {
  return (REGIONS as ReadonlyArray<string>).includes(value);
}

export interface RegionResult {
  treeId: string;
  region: Region;
}

/**
 * Set the tree's default region (Requirement 9.5). The backend rejects values
 * outside {Bac, Trung, Nam}, retaining the previous region (9.6).
 */
export function setRegion(treeId: string, region: Region): Promise<RegionResult> {
  return api.patch<RegionResult>(`/trees/${encodeURIComponent(treeId)}/region`, {
    region,
  });
}
