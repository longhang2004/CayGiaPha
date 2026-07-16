import type { ChecklistItemId } from "./checklist";

export const GUIDANCE_STORAGE_KEY = "cgp_guidance_v2";
const LEGACY_GUIDANCE_STORAGE_KEY = "cgp_guidance_v1";
export const GUIDANCE_REOPEN_EVENT = "cgp:guidance-reopen";
export const GUIDANCE_RESET_EVENT = "cgp:guidance-reset";

export type WorkspaceCoachChapter = "overview" | "actions" | "graph" | "person";
export type WorkspaceCoachStatus = "completed" | "skipped";

export interface WorkspaceCoachState {
  version: 2;
  chapters: Partial<Record<WorkspaceCoachChapter, WorkspaceCoachStatus>>;
}

export interface GuidanceState {
  schemaVersion: 5;
  completed: ChecklistItemId[];
  dismissedTopicVersions: Record<string, number>;
  onboardingSkipped: boolean;
  workspaceCoach: WorkspaceCoachState;
}

export const DEFAULT_GUIDANCE_STATE: GuidanceState = {
  schemaVersion: 5,
  completed: [],
  dismissedTopicVersions: {},
  onboardingSkipped: false,
  workspaceCoach: { version: 2, chapters: {} },
};

const ALLOWED_IDS: ChecklistItemId[] = [
  "core-tree-open",
  "core-first-person",
  "core-first-primitive",
  "core-inspect-address",
  "core-viewpoint",
];

const WORKSPACE_COACH_CHAPTERS: WorkspaceCoachChapter[] = [
  "overview",
  "actions",
  "graph",
  "person",
];

function createDefaultState(): GuidanceState {
  return {
    ...DEFAULT_GUIDANCE_STATE,
    completed: [],
    dismissedTopicVersions: {},
    workspaceCoach: { version: 2, chapters: {} },
  };
}

function isWorkspaceCoachStatus(value: unknown): value is WorkspaceCoachStatus {
  return value === "completed" || value === "skipped";
}

function sanitizeWorkspaceCoach(
  value: unknown,
  schemaVersion: unknown,
  onboardingSkipped: boolean,
): WorkspaceCoachState {
  const chapters: WorkspaceCoachState["chapters"] = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = value as {
      version?: unknown;
      status?: unknown;
      chapters?: unknown;
    };
    if (
      schemaVersion === 5 &&
      candidate.version === 2 &&
      candidate.chapters &&
      typeof candidate.chapters === "object" &&
      !Array.isArray(candidate.chapters)
    ) {
      const chapterCandidates = candidate.chapters as Record<string, unknown>;
      WORKSPACE_COACH_CHAPTERS.forEach((chapter) => {
        const status = chapterCandidates[chapter];
        if (isWorkspaceCoachStatus(status)) chapters[chapter] = status;
      });
    } else if (
      schemaVersion === 4 &&
      candidate.version === 1 &&
      isWorkspaceCoachStatus(candidate.status)
    ) {
      chapters.overview = candidate.status;
    }
  }
  if (onboardingSkipped && !chapters.overview) chapters.overview = "skipped";
  return { version: 2, chapters };
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
  const isKnownSchema =
    candidate.schemaVersion === 2 ||
    candidate.schemaVersion === 3 ||
    candidate.schemaVersion === 4 ||
    candidate.schemaVersion === 5;
  const isSkipped = isKnownSchema && candidate.onboardingSkipped === true;

  return {
    schemaVersion: 5,
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
    onboardingSkipped: isSkipped,
    workspaceCoach: sanitizeWorkspaceCoach(
      candidate.workspaceCoach,
      candidate.schemaVersion,
      isSkipped,
    ),
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
  if (!state.onboardingSkipped || state.workspaceCoach.chapters.overview !== "skipped") {
    writeGuidanceState(
      {
        ...state,
        onboardingSkipped: true,
        workspaceCoach: {
          version: 2,
          chapters: { ...state.workspaceCoach.chapters, overview: "skipped" },
        },
      },
      storage,
    );
  }
}

export function recordWorkspaceCoachStatus(
  chapter: WorkspaceCoachChapter,
  status: WorkspaceCoachStatus,
  storage?: Storage,
) {
  const state = readGuidanceState(storage);
  writeGuidanceState(
    {
      ...state,
      workspaceCoach: {
        version: 2,
        chapters: { ...state.workspaceCoach.chapters, [chapter]: status },
      },
    },
    storage,
  );
}

export interface GuidanceReopenDetail {
  chapter: WorkspaceCoachChapter;
}

export function reopenGuidanceChapter(chapter: WorkspaceCoachChapter) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<GuidanceReopenDetail>(GUIDANCE_REOPEN_EVENT, {
      detail: { chapter },
    }),
  );
}
