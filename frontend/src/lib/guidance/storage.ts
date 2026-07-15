import type { ChecklistItemId } from "./checklist";

export const GUIDANCE_STORAGE_KEY = "cgp_guidance_v2";
const LEGACY_GUIDANCE_STORAGE_KEY = "cgp_guidance_v1";
export const GUIDANCE_REOPEN_EVENT = "cgp:guidance-reopen";
export const GUIDANCE_RESET_EVENT = "cgp:guidance-reset";

export type WorkspaceCoachStatus = "completed" | "skipped";

export interface WorkspaceCoachState {
  version: 1;
  status: WorkspaceCoachStatus;
}

export interface GuidanceState {
  schemaVersion: 4;
  completed: ChecklistItemId[];
  dismissedTopicVersions: Record<string, number>;
  onboardingSkipped: boolean;
  workspaceCoach: WorkspaceCoachState | null;
}

export const DEFAULT_GUIDANCE_STATE: GuidanceState = {
  schemaVersion: 4,
  completed: [],
  dismissedTopicVersions: {},
  onboardingSkipped: false,
  workspaceCoach: null,
};

const ALLOWED_IDS: ChecklistItemId[] = [
  "core-tree-open",
  "core-first-person",
  "core-first-primitive",
  "core-inspect-address",
  "core-viewpoint",
];

function createDefaultState(): GuidanceState {
  return {
    ...DEFAULT_GUIDANCE_STATE,
    completed: [],
    dismissedTopicVersions: {},
    workspaceCoach: null,
  };
}

function sanitizeWorkspaceCoach(value: unknown): WorkspaceCoachState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { version?: unknown; status?: unknown };
  if (
    candidate.version !== 1 ||
    (candidate.status !== "completed" && candidate.status !== "skipped")
  ) {
    return null;
  }
  return { version: 1, status: candidate.status };
}

function sanitize(value: unknown): GuidanceState {
  if (!value || typeof value !== "object") return createDefaultState();
  const candidate = value as {
    schemaVersion?: unknown;
    completed?: unknown;
    dismissedTopicVersions?: unknown;
    onboardingSkipped?: unknown;
    workspaceCoach?: unknown;
  };
  const isLegacySchema = candidate.schemaVersion === 2 || candidate.schemaVersion === 3;
  const isSkipped = isLegacySchema && candidate.onboardingSkipped === true;
  const workspaceCoach =
    candidate.schemaVersion === 4
      ? sanitizeWorkspaceCoach(candidate.workspaceCoach)
      : isSkipped
        ? { version: 1 as const, status: "skipped" as const }
        : null;

  return {
    schemaVersion: 4,
    completed: Array.isArray(candidate.completed)
      ? candidate.completed.filter((id): id is ChecklistItemId =>
          ALLOWED_IDS.includes(id as ChecklistItemId),
        )
      : [],
    dismissedTopicVersions:
      candidate.dismissedTopicVersions &&
      typeof candidate.dismissedTopicVersions === "object"
        ? Object.fromEntries(
            Object.entries(candidate.dismissedTopicVersions).filter(
              ([key, version]) =>
                /^[a-z0-9-]+$/.test(key) &&
                Number.isInteger(version) &&
                Number(version) >= 1,
            ),
          )
        : {},
    onboardingSkipped:
      candidate.schemaVersion === 4
        ? candidate.onboardingSkipped === true
        : isSkipped,
    workspaceCoach,
  };
}

export function readGuidanceState(
  storage?: Pick<Storage, "getItem"> & Partial<Pick<Storage, "removeItem">>,
): GuidanceState {
  try {
    const current = storage?.getItem(GUIDANCE_STORAGE_KEY);
    if (current) return sanitize(JSON.parse(current));
    const legacy = storage?.getItem(LEGACY_GUIDANCE_STORAGE_KEY);
    if (!legacy) return createDefaultState();
    const migrated = sanitize(JSON.parse(legacy));
    storage?.removeItem?.(LEGACY_GUIDANCE_STORAGE_KEY);
    return migrated;
  } catch {
    return createDefaultState();
  }
}

export function writeGuidanceState(
  state: GuidanceState,
  storage?: Pick<Storage, "setItem">,
) {
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

export function skipGuidance(storage?: Storage) {
  const state = readGuidanceState(storage);
  if (!state.onboardingSkipped || state.workspaceCoach?.status !== "skipped") {
    writeGuidanceState(
      {
        ...state,
        onboardingSkipped: true,
        workspaceCoach: { version: 1, status: "skipped" },
      },
      storage,
    );
  }
}

export function recordWorkspaceCoachStatus(
  status: WorkspaceCoachStatus,
  storage?: Storage,
) {
  const state = readGuidanceState(storage);
  writeGuidanceState(
    {
      ...state,
      workspaceCoach: { version: 1, status },
    },
    storage,
  );
}
