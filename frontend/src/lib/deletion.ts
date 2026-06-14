/**
 * Two-phase node-deletion API helpers (task 10.4).
 *
 * Person deletion is deliberately two-phase so the owner always chooses a
 * strategy BEFORE anything is mutated (design "Node Deletion Cascade Choice",
 * Requirements 15.1, 15.2):
 *
 *   1. DELETE /persons/{id}?treeId=...   → returns the two-option choice and
 *      MUTATES NOTHING. (15.1)
 *   2. POST   /persons/{id}/delete       { treeId, strategy }  → executes the
 *      chosen strategy atomically. (15.3–15.9)
 *
 * Dismissing the prompt simply means step 2 is never called, so the graph is
 * left unchanged (15.2). Errors propagate as the typed {@link ApiError}; a
 * nonexistent target is rejected with a not-accessible indication (15.10).
 */

import { api } from "./apiClient";

/** The two deletion strategies the owner must choose between (15.1). */
export type DeletionStrategy = "cascade" | "preserve";

/** One presented option in the deletion-choice prompt. */
export interface DeletionOption {
  strategy: DeletionStrategy;
  /** Optional human-readable label/description from the backend. */
  label?: string;
  description?: string;
}

/**
 * Response of the prompt phase (DELETE). Carries the two options; some backends
 * additionally include impact counts (how many nodes the cascade would remove,
 * how many asserted edges preservation would create). The UI tolerates either.
 */
export interface DeletionChoice {
  personId: string;
  options?: DeletionOption[];
  /** Optional cascade impact preview. */
  cascadeRemovedCount?: number;
  /** Optional neighbor-preservation impact preview. */
  preserveCreatedEdgeCount?: number;
}

/** Result of executing a deletion (POST). */
export interface DeletionResult {
  personId: string;
  strategy: DeletionStrategy;
  removedPersonIds?: string[];
  createdAssertedEdgeIds?: string[];
}

/**
 * Begin deletion: ask the backend for the two-option choice. This call MUTATES
 * NOTHING (Requirements 15.1, 15.2) — it only surfaces the choice the dialog
 * presents to the owner.
 */
export function beginDeletion(
  personId: string,
  treeId: string,
  signal?: AbortSignal,
): Promise<DeletionChoice> {
  return api.del<DeletionChoice>(
    `/persons/${encodeURIComponent(personId)}?treeId=${encodeURIComponent(treeId)}`,
    { signal },
  );
}

/**
 * Execute deletion with the chosen strategy (Requirements 15.3–15.9). Only
 * called after the owner confirms one of the two options in the dialog.
 */
export function executeDeletion(
  personId: string,
  treeId: string,
  strategy: DeletionStrategy,
): Promise<DeletionResult> {
  return api.post<DeletionResult>(`/persons/${encodeURIComponent(personId)}/delete`, {
    treeId,
    strategy,
  });
}
