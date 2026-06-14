"use client";

import type { ConflictWarning as ConflictWarningData } from "@/lib/persons";

/**
 * Surfaces asserted-upgrade conflict warnings from a relationship-create
 * response (Requirement 7.5). When adding a bloodline edge completes an unbroken
 * path between a pair previously joined by an Asserted_Relationship and the
 * newly derived form of address differs from the stored asserted label, the
 * system retains the asserted label and warns — showing BOTH values so the owner
 * can resolve the discrepancy.
 *
 * Rendered with role="alert" so assistive technologies announce the conflict.
 */

interface ConflictWarningProps {
  conflicts: ConflictWarningData[] | undefined;
}

export function ConflictWarning({ conflicts }: ConflictWarningProps) {
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  return (
    <div role="alert" aria-live="assertive">
      <h3>Cảnh báo xung đột cách xưng hô</h3>
      <p>
        Nhãn bạn đã khai báo khác với cách xưng hô được hệ thống suy ra. Nhãn đã
        khai báo được giữ nguyên cho đến khi bạn xử lý.
      </p>
      <ul>
        {conflicts.map((conflict) => (
          <li key={`${conflict.sourceId}-${conflict.targetId}`}>
            <span>
              {"Nhãn đã khai báo: "}
              <strong data-testid="asserted-label">{conflict.assertedLabel}</strong>
            </span>
            {" — "}
            <span>
              {"Cách xưng hô suy ra: "}
              <strong data-testid="derived-term">{conflict.derivedTerm}</strong>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
