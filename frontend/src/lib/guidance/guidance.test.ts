import { describe, expect, it } from "vitest";
import { getEligibleChecklist } from "./checklist";
import { DEFAULT_GUIDANCE_STATE, GUIDANCE_STORAGE_KEY, readGuidanceState, recordChecklistCompletion } from "./storage";
describe("guidance eligibility and persistence", () => {
  const populated = { treeOpened: true, personCount: 2, primitiveCount: 0, addressInspected: false, viewpointChanged: false };
  it("never exposes edit tasks to readers and caps the checklist", () => {
    const items = getEligibleChecklist("reader", populated);
    expect(items).toHaveLength(3); expect(items.map(i => i.id)).not.toContain("core-first-primitive"); expect(items.length).toBeLessThanOrEqual(5);
  });
  it("uses product outcomes rather than opening Help", () => {
    expect(getEligibleChecklist("owner", populated).find(i => i.id === "core-inspect-address")?.complete(populated)).toBe(false);
  });
  it("sanitizes storage and records only categorical checklist IDs", () => {
    const values = new Map<string, string>(); const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } } as unknown as Storage;
    values.set(GUIDANCE_STORAGE_KEY, JSON.stringify({ ...DEFAULT_GUIDANCE_STATE, completed: ["core-tree-open", "private-person-id"], privateUrl: "/tree/secret" }));
    expect(readGuidanceState(storage).completed).toEqual(["core-tree-open"]);
    recordChecklistCompletion("core-first-person", storage);
    expect(values.get(GUIDANCE_STORAGE_KEY)).not.toContain("secret");
  });
  it("falls back safely when storage is unavailable", () => { expect(readGuidanceState({ getItem: () => { throw new Error("blocked"); } })).toEqual(DEFAULT_GUIDANCE_STATE); });
  it("migrates v1 completion without hidden, skipped, or private fields", () => {
    const values = new Map<string, string>([["cgp_guidance_v1", JSON.stringify({ schemaVersion: 1, hidden: true, skipped: true, completed: ["core-tree-open"], privateUrl: "/tree/private" })]]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => { values.delete(key); } };
    expect(readGuidanceState(storage)).toEqual({ ...DEFAULT_GUIDANCE_STATE, completed: ["core-tree-open"] });
    expect(JSON.stringify(readGuidanceState(storage))).not.toContain("private");
  });
});
