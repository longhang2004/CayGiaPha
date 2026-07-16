import { describe, expect, it } from "vitest";
import { getEligibleChecklist } from "./checklist";
import {
  DEFAULT_GUIDANCE_STATE,
  GUIDANCE_REOPEN_EVENT,
  GUIDANCE_STORAGE_KEY,
  readGuidanceState,
  recordChecklistCompletion,
  recordWorkspaceCoachStatus,
  reopenGuidanceChapter,
} from "./storage";

function createStorage(initial: Record<string, unknown> = {}) {
  const values = new Map(
    Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  } as unknown as Storage;

  return { storage, values };
}

describe("guidance eligibility and persistence", () => {
  const populated = {
    treeOpened: true,
    personCount: 2,
    primitiveCount: 0,
    addressInspected: false,
    viewpointChanged: false,
  };

  it("never exposes edit tasks to readers and caps the checklist", () => {
    const items = getEligibleChecklist("reader", populated);
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.id)).not.toContain("core-first-primitive");
    expect(items.length).toBeLessThanOrEqual(5);
  });

  it("uses product outcomes rather than opening Help", () => {
    expect(
      getEligibleChecklist("owner", populated).find(
        (item) => item.id === "core-inspect-address",
      )?.complete(populated),
    ).toBe(false);
  });

  it("defaults to schema 5 with an empty versioned chapter map", () => {
    expect(DEFAULT_GUIDANCE_STATE).toEqual({
      schemaVersion: 5,
      completed: [],
      dismissedTopicVersions: {},
      onboardingSkipped: false,
      workspaceCoach: { version: 2, chapters: {} },
    });
  });

  it("sanitizes storage and records only categorical checklist IDs", () => {
    const { storage, values } = createStorage({
      [GUIDANCE_STORAGE_KEY]: {
        ...DEFAULT_GUIDANCE_STATE,
        completed: ["core-tree-open", "private-person-id"],
        privateUrl: "/tree/secret",
      },
    });

    expect(readGuidanceState(storage).completed).toEqual(["core-tree-open"]);
    recordChecklistCompletion("core-first-person", storage);
    expect(values.get(GUIDANCE_STORAGE_KEY)).not.toContain("secret");
  });

  it("redacts unknown workspace coach chapters, statuses, and identifier fields", () => {
    const { storage } = createStorage({
      [GUIDANCE_STORAGE_KEY]: {
        ...DEFAULT_GUIDANCE_STATE,
        workspaceCoach: {
          version: 2,
          chapters: {
            overview: "completed",
            actions: "private-person-id",
            graph: "skipped",
            person: { status: "completed", personId: "person-secret" },
            "tree-123": "completed",
          },
          privateUrl: "/tree/secret",
        },
      },
    });

    const state = readGuidanceState(storage);
    expect(state.workspaceCoach).toEqual({
      version: 2,
      chapters: { overview: "completed", graph: "skipped" },
    });
    expect(JSON.stringify(state)).not.toMatch(/person-secret|tree-123|privateUrl|private-person-id/);
  });

  it.each([2, 3])(
    "migrates schema %i while preserving safe checklist and topic state",
    (schemaVersion) => {
      const { storage } = createStorage({
        [GUIDANCE_STORAGE_KEY]: {
          schemaVersion,
          completed: ["core-tree-open", "private-person-id"],
          dismissedTopicVersions: { "doi-diem-nhin": 2, Private_Name: 4 },
          onboardingSkipped: false,
        },
      });

      expect(readGuidanceState(storage)).toEqual({
        ...DEFAULT_GUIDANCE_STATE,
        completed: ["core-tree-open"],
        dismissedTopicVersions: { "doi-diem-nhin": 2 },
      });
    },
  );

  it("migrates a schema-4 coach decision into the overview chapter", () => {
    const { storage } = createStorage({
      [GUIDANCE_STORAGE_KEY]: {
        schemaVersion: 4,
        completed: ["core-tree-open", "private-person-id"],
        dismissedTopicVersions: { "doi-diem-nhin": 2, Private_Name: 4 },
        onboardingSkipped: false,
        workspaceCoach: { version: 1, status: "completed" },
        privateUrl: "/tree/private",
      },
    });

    expect(readGuidanceState(storage)).toEqual({
      ...DEFAULT_GUIDANCE_STATE,
      completed: ["core-tree-open"],
      dismissedTopicVersions: { "doi-diem-nhin": 2 },
      workspaceCoach: {
        version: 2,
        chapters: { overview: "completed" },
      },
    });
  });

  it("migrates an old onboarding skip to a skipped overview chapter", () => {
    const { storage } = createStorage({
      [GUIDANCE_STORAGE_KEY]: {
        schemaVersion: 3,
        completed: ["core-tree-open"],
        dismissedTopicVersions: {},
        onboardingSkipped: true,
      },
    });

    expect(readGuidanceState(storage)).toEqual({
      ...DEFAULT_GUIDANCE_STATE,
      completed: ["core-tree-open"],
      onboardingSkipped: true,
      workspaceCoach: {
        version: 2,
        chapters: { overview: "skipped" },
      },
    });
  });

  it("records independent workspace coach chapter decisions without losing safe state", () => {
    const { storage, values } = createStorage({
      [GUIDANCE_STORAGE_KEY]: {
        ...DEFAULT_GUIDANCE_STATE,
        completed: ["core-tree-open"],
        dismissedTopicVersions: { "doi-diem-nhin": 2 },
        privateUrl: "/tree/private",
      },
    });

    recordWorkspaceCoachStatus("overview", "completed", storage);
    recordWorkspaceCoachStatus("graph", "skipped", storage);

    expect(readGuidanceState(storage)).toEqual({
      ...DEFAULT_GUIDANCE_STATE,
      completed: ["core-tree-open"],
      dismissedTopicVersions: { "doi-diem-nhin": 2 },
      workspaceCoach: {
        version: 2,
        chapters: { overview: "completed", graph: "skipped" },
      },
    });
    expect(values.get(GUIDANCE_STORAGE_KEY)).not.toContain("private");
  });

  it("dispatches typed chapter replay detail while generic reopen events remain valid", () => {
    const received: Array<unknown> = [];
    const listener = (event: Event) => {
      received.push(event instanceof CustomEvent ? event.detail : undefined);
    };
    window.addEventListener(GUIDANCE_REOPEN_EVENT, listener);

    try {
      window.dispatchEvent(new Event(GUIDANCE_REOPEN_EVENT));
      reopenGuidanceChapter("person");
    } finally {
      window.removeEventListener(GUIDANCE_REOPEN_EVENT, listener);
    }

    expect(received).toEqual([undefined, { chapter: "person" }]);
  });

  it("falls back safely when storage is unavailable", () => {
    expect(
      readGuidanceState({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toEqual(DEFAULT_GUIDANCE_STATE);
  });

  it("migrates v1 completion without hidden, skipped, or private fields", () => {
    const { storage } = createStorage({
      cgp_guidance_v1: {
        schemaVersion: 1,
        hidden: true,
        skipped: true,
        completed: ["core-tree-open"],
        privateUrl: "/tree/private",
      },
    });

    expect(readGuidanceState(storage)).toEqual({
      ...DEFAULT_GUIDANCE_STATE,
      completed: ["core-tree-open"],
    });
    expect(JSON.stringify(readGuidanceState(storage))).not.toContain("private");
  });
});
