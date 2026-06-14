"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  createPerson,
  editPerson,
  setVisibility,
  type CreatePersonInput,
  type EditPersonInput,
  type Gender,
} from "@/lib/persons";
import { Button } from "@/components/Button";
import {
  DEFAULT_VISIBILITY,
  VisibilityToggles,
  hasVisibilityChange,
  visibilityDiff,
  type VisibilityState,
} from "./VisibilityToggles";

/**
 * Create/edit form for a Person node (Requirements 3.1, 3.3) with per-field
 * visibility toggles (Requirement 14.1).
 *
 * Fields: display name (1-100), gender (male/female), optional birth order
 * (1-99), optional birth year (1000-current), and death status (boolean). On
 * submit the person fields are sent first; any non-default visibility change is
 * then applied via the visibility endpoint (which needs the node id).
 *
 * Field-level validation errors from the backend error envelope
 * (`ApiError.field` / `.message`) are surfaced inline and associated with the
 * offending control via `aria-describedby` + `aria-invalid` for accessibility.
 */

export interface PersonFormInitialValues {
  displayName?: string;
  gender?: Gender;
  birthOrder?: number;
  birthYear?: number;
  deathStatus?: boolean;
  visibility?: VisibilityState;
}

interface PersonFormProps {
  mode: "create" | "edit";
  /** Required to scope edits / visibility updates to a tree. */
  treeId: string;
  /** Required in edit mode: the person being edited. */
  personId?: string;
  initialValues?: PersonFormInitialValues;
  onSuccess?: (personId: string) => void;
}

function parseOptionalInt(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function PersonForm({
  mode,
  treeId,
  personId,
  initialValues,
  onSuccess,
}: PersonFormProps) {
  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? "");
  const [gender, setGender] = useState<Gender>(initialValues?.gender ?? "male");
  const [birthOrder, setBirthOrder] = useState(
    initialValues?.birthOrder != null ? String(initialValues.birthOrder) : "",
  );
  const [birthYear, setBirthYear] = useState(
    initialValues?.birthYear != null ? String(initialValues.birthYear) : "",
  );
  const [deathStatus, setDeathStatus] = useState(initialValues?.deathStatus ?? false);
  const [visibility, setVisibilityState] = useState<VisibilityState>(
    initialValues?.visibility ?? DEFAULT_VISIBILITY,
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function describedBy(field: string): string | undefined {
    return fieldErrors[field] ? `${field}-error` : undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    const order = parseOptionalInt(birthOrder);
    const year = parseOptionalInt(birthYear);

    try {
      let resolvedId = personId;

      if (mode === "create") {
        const body: CreatePersonInput = {
          displayName,
          gender,
          deathStatus,
          ...(order !== undefined ? { birthOrder: order } : {}),
          ...(year !== undefined ? { birthYear: year } : {}),
        };
        const created = await createPerson(body);
        resolvedId = created.id;
      } else {
        if (!personId) {
          throw new Error("personId is required to edit a person.");
        }
        const body: EditPersonInput = {
          displayName,
          gender,
          deathStatus,
          ...(order !== undefined ? { birthOrder: order } : {}),
          ...(year !== undefined ? { birthYear: year } : {}),
        };
        await editPerson(personId, treeId, body);
      }

      // Apply visibility changes once the node id is known (14.1).
      const baseline = mode === "edit" ? initialValues?.visibility : undefined;
      const diff = visibilityDiff(visibility, baseline ?? DEFAULT_VISIBILITY);
      if (resolvedId && hasVisibilityChange(diff)) {
        await setVisibility(resolvedId, treeId, diff);
      }

      if (resolvedId) {
        onSuccess?.(resolvedId);
      }
    } catch (error) {
      if (error instanceof ApiError && error.field) {
        setFieldErrors({ [error.field]: error.message });
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Không thể lưu. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label={mode === "create" ? "Tạo người" : "Sửa người"}>
      {formError ? (
        <p role="alert" data-testid="form-error">
          {formError}
        </p>
      ) : null}

      <p>
        <label htmlFor="displayName">Họ và tên</label>
        <br />
        <input
          id="displayName"
          name="displayName"
          type="text"
          value={displayName}
          required
          aria-invalid={fieldErrors.displayName ? true : undefined}
          aria-describedby={describedBy("displayName")}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        {fieldErrors.displayName ? (
          <span id="displayName-error" role="alert">
            {fieldErrors.displayName}
          </span>
        ) : null}
      </p>

      <fieldset>
        <legend>Giới tính</legend>
        <label htmlFor="gender-male">
          <input
            id="gender-male"
            type="radio"
            name="gender"
            value="male"
            checked={gender === "male"}
            onChange={() => setGender("male")}
          />
          {" Nam"}
        </label>
        <label htmlFor="gender-female">
          <input
            id="gender-female"
            type="radio"
            name="gender"
            value="female"
            checked={gender === "female"}
            onChange={() => setGender("female")}
          />
          {" Nữ"}
        </label>
        {fieldErrors.gender ? (
          <span id="gender-error" role="alert">
            {fieldErrors.gender}
          </span>
        ) : null}
      </fieldset>

      <p>
        <label htmlFor="birthOrder">Thứ tự sinh (tùy chọn)</label>
        <br />
        <input
          id="birthOrder"
          name="birthOrder"
          type="number"
          min={1}
          max={99}
          value={birthOrder}
          aria-invalid={fieldErrors.birthOrder ? true : undefined}
          aria-describedby={describedBy("birthOrder")}
          onChange={(e) => setBirthOrder(e.target.value)}
        />
        {fieldErrors.birthOrder ? (
          <span id="birthOrder-error" role="alert">
            {fieldErrors.birthOrder}
          </span>
        ) : null}
      </p>

      <p>
        <label htmlFor="birthYear">Năm sinh (tùy chọn)</label>
        <br />
        <input
          id="birthYear"
          name="birthYear"
          type="number"
          min={1000}
          value={birthYear}
          aria-invalid={fieldErrors.birthYear ? true : undefined}
          aria-describedby={describedBy("birthYear")}
          onChange={(e) => setBirthYear(e.target.value)}
        />
        {fieldErrors.birthYear ? (
          <span id="birthYear-error" role="alert">
            {fieldErrors.birthYear}
          </span>
        ) : null}
      </p>

      <p>
        <label htmlFor="deathStatus">
          <input
            id="deathStatus"
            name="deathStatus"
            type="checkbox"
            checked={deathStatus}
            onChange={(e) => setDeathStatus(e.target.checked)}
          />
          {" Đã mất"}
        </label>
      </p>

      <VisibilityToggles
        value={visibility}
        onChange={setVisibilityState}
        disabled={submitting}
      />

      <Button type="submit" disabled={submitting}>
        {mode === "create" ? "Tạo" : "Lưu"}
      </Button>
    </form>
  );
}
