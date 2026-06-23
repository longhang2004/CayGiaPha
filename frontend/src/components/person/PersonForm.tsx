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
import { uploadPhoto } from "@/lib/photos";

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
  phone?: string;
  email?: string;
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
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [deathStatus, setDeathStatus] = useState(initialValues?.deathStatus ?? false);
  const [visibility, setVisibilityState] = useState<VisibilityState>(
    initialValues?.visibility ?? DEFAULT_VISIBILITY,
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

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
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
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
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        };
        await editPerson(personId, treeId, body);
      }

      // Upload photo if selected
      if (photoFile && resolvedId) {
        try {
          await uploadPhoto(treeId, resolvedId, photoFile);
        } catch (uploadErr) {
          console.error("Failed to upload photo:", uploadErr);
          // Don't fail the whole form submit if photo fails, just warn
          alert("Lưu thông tin thành công nhưng không thể tải ảnh lên: " + (uploadErr instanceof Error ? uploadErr.message : ""));
        }
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
        <p role="alert" data-testid="form-error" className="form-error">
          {formError}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="displayName">Họ và tên</label>
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
          <span id="displayName-error" role="alert" className="field-error">
            {fieldErrors.displayName}
          </span>
        ) : null}
      </div>

      <fieldset>
        <legend>Giới tính</legend>
        <div style={{ display: "flex", gap: "1rem" }}>
          <label htmlFor="gender-male" style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
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
          <label htmlFor="gender-female" style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
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
        </div>
        {fieldErrors.gender ? (
          <span id="gender-error" role="alert" className="field-error">
            {fieldErrors.gender}
          </span>
        ) : null}
      </fieldset>

      <div className="field">
        <label htmlFor="birthOrder">Thứ tự sinh (tùy chọn)</label>
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
        <p className="field-hint" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
          Lưu ý: Người sinh thứ 1 (đầu lòng) là con cả/Anh Hai/Chị Hai (nhập số 1).
        </p>
        {fieldErrors.birthOrder ? (
          <span id="birthOrder-error" role="alert" className="field-error">
            {fieldErrors.birthOrder}
          </span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="birthYear">Năm sinh (tùy chọn)</label>
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
          <span id="birthYear-error" role="alert" className="field-error">
            {fieldErrors.birthYear}
          </span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="phone">Số điện thoại (tùy chọn)</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="email">Email (tùy chọn)</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="field photo-upload-container">
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png"
          className="photo-upload-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setPhotoFile(file);
              setPhotoPreviewUrl(URL.createObjectURL(file));
            } else {
              setPhotoFile(null);
              setPhotoPreviewUrl(null);
            }
          }}
        />
        <label htmlFor="photo" className="photo-upload-zone">
          <span className="photo-upload-zone__icon">📤</span>
          <span className="photo-upload-zone__title">
            {photoFile ? `Đã chọn: ${photoFile.name}` : "Hình ảnh đại diện (tùy chọn)"}
          </span>
          <span className="photo-upload-zone__subtitle">Kéo thả file hoặc click để chọn ảnh đại diện</span>
        </label>
        {photoPreviewUrl && (
          <div style={{ marginTop: "0.5rem" }}>
            <img
              src={photoPreviewUrl}
              alt="Xem trước ảnh"
              style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--color-hairline)" }}
            />
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="deathStatus" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
          <input
            id="deathStatus"
            name="deathStatus"
            type="checkbox"
            checked={deathStatus}
            onChange={(e) => setDeathStatus(e.target.checked)}
          />
          <span>Đã mất</span>
        </label>
      </div>

      <VisibilityToggles
        value={visibility}
        onChange={setVisibilityState}
        disabled={submitting}
      />

      <div className="form-actions">
        <Button type="submit" disabled={submitting}>
          {mode === "create" ? "Tạo" : "Lưu"}
        </Button>
      </div>
    </form>
  );
}
