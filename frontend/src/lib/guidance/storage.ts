import type { ChecklistItemId } from "./checklist";

export const GUIDANCE_STORAGE_KEY = "cgp_guidance_v2";
const LEGACY_GUIDANCE_STORAGE_KEY = "cgp_guidance_v1";
export const GUIDANCE_REOPEN_EVENT = "cgp:guidance-reopen";
export const GUIDANCE_RESET_EVENT = "cgp:guidance-reset";

export interface GuidanceState {
  schemaVersion: 2;
  completed: ChecklistItemId[];
  dismissedTopicVersions: Record<string, number>;
}

export const DEFAULT_GUIDANCE_STATE: GuidanceState = {
  schemaVersion: 2,
  completed: [],
  dismissedTopicVersions: {},
};

const ALLOWED_IDS: ChecklistItemId[] = [
  "core-tree-open",
  "core-first-person",
  "core-first-primitive",
  "core-inspect-address",
  "core-viewpoint",
];

function sanitize(value: unknown): GuidanceState {
  if (!value || typeof value !== "object") return { ...DEFAULT_GUIDANCE_STATE };
  const candidate = value as Partial<GuidanceState>;
  return {
    schemaVersion: 2,
    completed: Array.isArray(candidate.completed)
      ? candidate.completed.filter((id): id is ChecklistItemId => ALLOWED_IDS.includes(id as ChecklistItemId))
      : [],
    dismissedTopicVersions:
      candidate.dismissedTopicVersions && typeof candidate.dismissedTopicVersions === "object"
        ? Object.fromEntries(
            Object.entries(candidate.dismissedTopicVersions).filter(
              ([key, version]) => /^[a-z0-9-]+$/.test(key) && Number.isInteger(version),
            ),
          )
        : {},
  };
}

export function readGuidanceState(storage?: Pick<Storage, "getItem"> & Partial<Pick<Storage, "removeItem">>): GuidanceState {
  try {
    const current = storage?.getItem(GUIDANCE_STORAGE_KEY);
    if (current) return sanitize(JSON.parse(current));
    const legacy = storage?.getItem(LEGACY_GUIDANCE_STORAGE_KEY);
    if (!legacy) return { ...DEFAULT_GUIDANCE_STATE };
    const migrated = sanitize(JSON.parse(legacy));
    storage?.removeItem?.(LEGACY_GUIDANCE_STORAGE_KEY);
    return migrated;
  } catch {
    return { ...DEFAULT_GUIDANCE_STATE };
  }
}

export function writeGuidanceState(state: GuidanceState, storage?: Pick<Storage, "setItem">) {
  try {
    storage?.setItem(GUIDANCE_STORAGE_KEY, JSON.stringify(sanitize(state)));
  } catch {
    // Guidance remains usable without persistence.
  }
}

export function resetGuidanceState(storage?: Pick<Storage, "removeItem">) {
  try {
    storage?.removeItem(GUIDANCE_STORAGE_KEY);
    storage?.removeItem(LEGACY_GUIDANCE_STORAGE_KEY);
  } catch {
    // Storage is optional.
  }
}

export function recordChecklistCompletion(id: ChecklistItemId, storage?: Storage) {
  const state = readGuidanceState(storage);
  if (!state.completed.includes(id)) {
    writeGuidanceState({ ...state, completed: [...state.completed, id] }, storage);
  }
}
