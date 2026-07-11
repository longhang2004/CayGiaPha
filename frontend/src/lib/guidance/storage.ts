import type { ChecklistItemId } from "./checklist";
export const GUIDANCE_STORAGE_KEY = "cgp_guidance_v1";
export interface GuidanceState { schemaVersion: 1; hidden: boolean; skipped: boolean; collapsed: boolean; completed: ChecklistItemId[]; dismissedTopicVersions: Record<string, number>; }
export const DEFAULT_GUIDANCE_STATE: GuidanceState = { schemaVersion: 1, hidden: false, skipped: false, collapsed: false, completed: [], dismissedTopicVersions: {} };
function sanitize(value: unknown): GuidanceState {
  if (!value || typeof value !== "object") return { ...DEFAULT_GUIDANCE_STATE };
  const v = value as Partial<GuidanceState>;
  const allowed: ChecklistItemId[] = ["core-tree-open", "core-first-person", "core-first-primitive", "core-inspect-address", "core-viewpoint"];
  return { schemaVersion: 1, hidden: v.hidden === true, skipped: v.skipped === true, collapsed: v.collapsed === true, completed: Array.isArray(v.completed) ? v.completed.filter((id): id is ChecklistItemId => allowed.includes(id as ChecklistItemId)) : [], dismissedTopicVersions: v.dismissedTopicVersions && typeof v.dismissedTopicVersions === "object" ? Object.fromEntries(Object.entries(v.dismissedTopicVersions).filter(([k,n]) => /^[a-z0-9-]+$/.test(k) && Number.isInteger(n))) : {} };
}
export function readGuidanceState(storage?: Pick<Storage, "getItem">): GuidanceState { try { const raw = storage?.getItem(GUIDANCE_STORAGE_KEY); return raw ? sanitize(JSON.parse(raw)) : { ...DEFAULT_GUIDANCE_STATE }; } catch { return { ...DEFAULT_GUIDANCE_STATE }; } }
export function writeGuidanceState(state: GuidanceState, storage?: Pick<Storage, "setItem">) { try { storage?.setItem(GUIDANCE_STORAGE_KEY, JSON.stringify(sanitize(state))); } catch { /* guidance remains usable without persistence */ } }
export function recordChecklistCompletion(id: ChecklistItemId, storage?: Storage) { const state = readGuidanceState(storage); if (!state.completed.includes(id)) writeGuidanceState({ ...state, completed: [...state.completed, id] }, storage); }
