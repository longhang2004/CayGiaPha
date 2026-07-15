import { describe, expect, it } from "vitest";
import { getEligibleChecklist } from "./checklist";
import {
  DEFAULT_GUIDANCE_STATE,
  GUIDANCE_STORAGE_KEY,
  readGuidanceState,
  recordChecklistCompletion,
  recordWorkspaceCoachStatus,
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

  it("defaults to schema 4 with no workspace coach decision", () => {
    expect(DEFAULT_GUIDANCE_STATE).toEqual({
      schemaVersion: 4,
      completed: [],
      dismissedTopicVersions: {},
      onboardingSkipped: false,
      workspaceCoach: null,
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

  it("accepts only the known workspace coach version and statuses", () => {
    const { storage: validStorage } = createStorage({
      [GUIDANCE_STORAGE_KEY]: {
        ...DEFAULT_GUIDANCE_STATE,
        workspaceCoach: { version: 1, status: "completed" },
      },
    });
    const { storage: invalidStorage } = createStorage({
      [GUIDANCE_STORAGE_KEY]: {
        ...DEFAULT_GUIDANCE_STATE,
        workspaceCoach: { version: 99, status: "private-person-id" },
      },
    });

    expect(readGuidanceState(validStorage).workspaceCoach).toEqual({
      version: 1,
      status: "completed",
    });
    expect(readGuidanceState(invalidStorage).workspaceCoach).toBeNull();
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

  it("migrates an old onboarding skip to a skipped workspace coach", () => {
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
      workspaceCoach: { version: 1, status: "skipped" },
    });
  });

  it("records completed and skipped workspace coach decisions", () => {
    const { storage } = createStorage();

    recordWorkspaceCoachStatus("completed", storage);
    expect(readGuidanceState(storage).workspaceCoach).toEqual({
      version: 1,
      status: "completed",
    });

    recordWorkspaceCoachStatus("skipped", storage);
    expect(readGuidanceState(storage).workspaceCoach).toEqual({
      version: 1,
      status: "skipped",
    });
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
