"use client";

import type { Visibility, VisibilityInput } from "@/lib/persons";

/**
 * Per-field visibility controls for a person's sensitive fields: marital,
 * adoption, and death status (Requirement 14.1). Each toggle holds exactly one
 * of "private" or "public"; the default is "private" (14.2).
 *
 * Rendered as a fieldset of accessible checkboxes (checked = public) so each
 * control carries a programmatic name/role/value and is keyboard reachable.
 */

export interface VisibilityState {
  visMarital: Visibility;
  visAdoption: Visibility;
  visDeath: Visibility;
}

export const DEFAULT_VISIBILITY: VisibilityState = {
  visMarital: "private",
  visAdoption: "private",
  visDeath: "private",
};

interface VisibilityTogglesProps {
  value: VisibilityState;
  onChange: (next: VisibilityState) => void;
  disabled?: boolean;
}

const FIELDS: { key: keyof VisibilityState; label: string }[] = [
  { key: "visMarital", label: "Tình trạng hôn nhân" },
  { key: "visAdoption", label: "Tình trạng nhận nuôi" },
  { key: "visDeath", label: "Tình trạng mất" },
];

export function VisibilityToggles({
  value,
  onChange,
  disabled,
}: VisibilityTogglesProps) {
  return (
    <fieldset>
      <legend>Quyền riêng tư (mặc định: riêng tư)</legend>
      {FIELDS.map(({ key, label }) => {
        const isPublic = value[key] === "public";
        const id = `vis-${key}`;
        return (
          <p key={key}>
            <label htmlFor={id}>
              <input
                id={id}
                type="checkbox"
                name={key}
                checked={isPublic}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...value,
                    [key]: e.target.checked ? "public" : "private",
                  })
                }
              />
              {` ${label}: `}
              <span>{isPublic ? "công khai" : "riêng tư"}</span>
            </label>
          </p>
        );
      })}
    </fieldset>
  );
}

/** Reduce a visibility state to the changed/non-default fields for a PATCH body. */
export function visibilityDiff(
  current: VisibilityState,
  baseline: VisibilityState = DEFAULT_VISIBILITY,
): VisibilityInput {
  const diff: VisibilityInput = {};
  if (current.visMarital !== baseline.visMarital) diff.visMarital = current.visMarital;
  if (current.visAdoption !== baseline.visAdoption) diff.visAdoption = current.visAdoption;
  if (current.visDeath !== baseline.visDeath) diff.visDeath = current.visDeath;
  return diff;
}

/** True when a visibility diff carries at least one field to update. */
export function hasVisibilityChange(diff: VisibilityInput): boolean {
  return Object.keys(diff).length > 0;
}
