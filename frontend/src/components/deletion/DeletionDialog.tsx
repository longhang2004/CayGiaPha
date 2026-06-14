"use client";

import { useState } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  beginDeletion,
  executeDeletion,
  type DeletionChoice,
  type DeletionStrategy,
} from "@/lib/deletion";
import { Button } from "@/components/Button";

/**
 * Two-phase deletion-choice dialog (task 10.4, Requirements 15.1, 15.2).
 *
 * Flow, designed so NOTHING is mutated until the owner confirms a strategy:
 *   1. "Xóa" triggers the prompt phase — DELETE returns the two-option choice
 *      and mutates nothing (15.1). The dialog opens showing BOTH options.
 *   2. The owner picks cascade or neighbor-preservation and confirms; only then
 *      do we POST the chosen strategy to execute it (15.3–15.9).
 *   3. Dismissing the dialog ("Hủy") makes no execute call, so the target node
 *      and its edges are left unchanged (15.2).
 *
 * Both options are always presented before any mutation, and the execute
 * request is never sent until the owner confirms.
 */

interface DeletionDialogProps {
  personId: string;
  treeId: string;
  /** Optional label for the trigger button. */
  triggerLabel?: string;
  onDeleted?: (personId: string, strategy: DeletionStrategy) => void;
  onDismiss?: () => void;
}

const STRATEGY_LABELS: Record<DeletionStrategy, { title: string; description: string }> = {
  cascade: {
    title: "Xóa lan truyền (cascade)",
    description:
      "Xóa người này, mọi liên kết của họ, rồi xóa tiếp những người trở nên không còn liên kết do thao tác này.",
  },
  preserve: {
    title: "Giữ lại người lân cận (neighbor preservation)",
    description:
      "Xóa người này nhưng giữ lại tất cả người từng liên kết với họ; tạo liên kết khai báo (nét đứt) cho các cặp chỉ nối với nhau qua người bị xóa.",
  },
};

export function DeletionDialog({
  personId,
  treeId,
  triggerLabel = "Xóa",
  onDeleted,
  onDismiss,
}: DeletionDialogProps) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<DeletionChoice | null>(null);
  const [strategy, setStrategy] = useState<DeletionStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  async function handleOpen() {
    setError(null);
    setStrategy(null);
    setChoice(null);
    setLoading(true);
    try {
      // Prompt phase: returns the choice and MUTATES NOTHING (15.1).
      const result = await beginDeletion(personId, treeId);
      setChoice(result);
      setOpen(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Không thể bắt đầu xóa. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    // No execute call — target and edges left unchanged (15.2).
    setOpen(false);
    setChoice(null);
    setStrategy(null);
    setError(null);
    onDismiss?.();
  }

  async function handleConfirm() {
    if (!strategy) {
      setError("Vui lòng chọn một phương án.");
      return;
    }
    setError(null);
    setExecuting(true);
    try {
      await executeDeletion(personId, treeId, strategy);
      setOpen(false);
      setChoice(null);
      onDeleted?.(personId, strategy);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Không thể xóa. Vui lòng thử lại.");
      }
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={handleOpen} disabled={loading}>
        {triggerLabel}
      </Button>

      {open && choice ? (
        <div role="dialog" aria-modal="true" aria-label="Chọn cách xóa">
          <h2>Chọn cách xóa</h2>
          {error ? (
            <p role="alert" data-testid="deletion-error">
              {error}
            </p>
          ) : null}

          <fieldset>
            <legend>Phương án</legend>
            {(["cascade", "preserve"] as DeletionStrategy[]).map((s) => (
              <label key={s} htmlFor={`deletion-${s}`} style={{ display: "block" }}>
                <input
                  id={`deletion-${s}`}
                  type="radio"
                  name="deletion-strategy"
                  value={s}
                  checked={strategy === s}
                  onChange={() => setStrategy(s)}
                />
                <strong>{STRATEGY_LABELS[s].title}</strong>
                <br />
                <span>{STRATEGY_LABELS[s].description}</span>
              </label>
            ))}
          </fieldset>

          <Button type="button" onClick={handleConfirm} disabled={executing || !strategy}>
            Xác nhận xóa
          </Button>
          <Button type="button" onClick={handleDismiss} disabled={executing}>
            Hủy
          </Button>
        </div>
      ) : null}
    </div>
  );
}
