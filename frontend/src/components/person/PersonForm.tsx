"use client";

import { useState, useEffect, type FormEvent } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  createPerson,
  editPerson,
  setVisibility,
  convertSolarToLunar,
  convertLunarToSolar,
  addDerivedRelative,
  type CreatePersonInput,
  type EditPersonInput,
  type Gender,
} from "@/lib/persons";
import { type PersonOption } from "./AddRelativeForm";
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
  deathDay?: number;
  deathMonth?: number;
  deathYear?: number;
  deathCalendar?: string;
  deathLunarLeap?: boolean;
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
  onCancel?: () => void;
  persons?: PersonOption[];
  hideCancelButton?: boolean;
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
  onCancel,
  persons = [],
  hideCancelButton = false,
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
  const [deathDay, setDeathDay] = useState(
    initialValues?.deathDay != null ? String(initialValues.deathDay) : "",
  );
  const [deathMonth, setDeathMonth] = useState(
    initialValues?.deathMonth != null ? String(initialValues.deathMonth) : "",
  );
  const [deathYear, setDeathYear] = useState(
    initialValues?.deathYear != null ? String(initialValues.deathYear) : "",
  );
  const [deathCalendar, setDeathCalendar] = useState<string>(
    initialValues?.deathCalendar ?? "lunar",
  );
  const [deathLunarLeap, setDeathLunarLeap] = useState<boolean>(
    initialValues?.deathLunarLeap ?? false,
  );
  const [conversionPreview, setConversionPreview] = useState<string>("");
  const [visibility, setVisibilityState] = useState<VisibilityState>(
    initialValues?.visibility ?? DEFAULT_VISIBILITY,
  );

  const [linkRelationship, setLinkRelationship] = useState(false);
  const [relTargetId, setRelTargetId] = useState(persons[0]?.id ?? "");
  const [derivedKind, setDerivedKind] = useState<
    "bloodline_father" | "bloodline_father_reverse" | "bloodline_mother" | "bloodline_mother_reverse" | "marriage"
  >("bloodline_father");
  const [maritalStatus, setMaritalStatus] = useState<"married" | "divorced" | "deceased">("married");

  useEffect(() => {
    if (persons.length > 0 && !relTargetId) {
      setRelTargetId(persons[0].id);
    }
  }, [persons, relTargetId]);

  const sourceName = displayName.trim() || "Thành viên mới";
  const targetPerson = persons.find((p) => p.id === relTargetId);
  const targetName = targetPerson?.displayName ?? "Thành viên B";

  useEffect(() => {
    if (!deathStatus || !deathDay || !deathMonth) {
      setConversionPreview("");
      return;
    }
    const day = Number(deathDay);
    const month = Number(deathMonth);
    const year = deathYear ? Number(deathYear) : new Date().getFullYear();

    if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12) {
      setConversionPreview("");
      return;
    }

    let active = true;
    if (deathCalendar === "lunar") {
      convertLunarToSolar(day, month, year, deathLunarLeap)
        .then((res) => {
          if (active) {
            setConversionPreview(`Tương đương Dương lịch: ${res.formatted}`);
          }
        })
        .catch(() => {
          if (active) setConversionPreview("Ngày Âm lịch không hợp lệ");
        });
    } else {
      convertSolarToLunar(day, month, year)
        .then((res) => {
          if (active) {
            setConversionPreview(`Tương đương Âm lịch: ${res.formatted}`);
          }
        })
        .catch(() => {
          if (active) setConversionPreview("Ngày Dương lịch không hợp lệ");
        });
    }
    return () => {
      active = false;
    };
  }, [deathStatus, deathDay, deathMonth, deathYear, deathCalendar, deathLunarLeap]);
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
    const dDay = parseOptionalInt(deathDay);
    const dMonth = parseOptionalInt(deathMonth);
    const dYear = parseOptionalInt(deathYear);

    try {
      let resolvedId = personId;

      if (mode === "create") {
        const body: CreatePersonInput = {
          displayName,
          gender,
          deathStatus,
          ...(deathStatus && dDay !== undefined && dMonth !== undefined ? {
            deathDay: dDay,
            deathMonth: dMonth,
            deathYear: dYear,
            deathCalendar,
            deathLunarLeap,
          } : {}),
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
          deathDay: deathStatus ? dDay : undefined,
          deathMonth: deathStatus ? dMonth : undefined,
          deathYear: deathStatus ? dYear : undefined,
          deathCalendar: deathStatus && dDay !== undefined && dMonth !== undefined ? deathCalendar : undefined,
          deathLunarLeap: deathStatus && dDay !== undefined && dMonth !== undefined ? deathLunarLeap : undefined,
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

      // Create relationship if requested
      if (mode === "create" && linkRelationship && relTargetId && resolvedId) {
        let finalType: "bloodline_father" | "bloodline_mother" | "marriage" = "bloodline_father";
        let finalSourceId = resolvedId;
        let finalTargetId = relTargetId;

        if (derivedKind === "bloodline_father") {
          finalType = "bloodline_father";
        } else if (derivedKind === "bloodline_father_reverse") {
          finalType = "bloodline_father";
          finalSourceId = relTargetId;
          finalTargetId = resolvedId;
        } else if (derivedKind === "bloodline_mother") {
          finalType = "bloodline_mother";
        } else if (derivedKind === "bloodline_mother_reverse") {
          finalType = "bloodline_mother";
          finalSourceId = relTargetId;
          finalTargetId = resolvedId;
        } else if (derivedKind === "marriage") {
          finalType = "marriage";
        }

        await addDerivedRelative({
          treeId,
          type: finalType,
          sourceId: finalSourceId,
          targetId: finalTargetId,
          ...(derivedKind === "marriage" ? { maritalStatus } : {}),
        });
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

      {deathStatus && (
        <div className="death-details-pane" style={{
          marginTop: "1rem",
          padding: "1rem",
          borderRadius: "8px",
          border: "1px solid var(--color-hairline)",
          background: "rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}>
          <div className="field">
            <label style={{ fontWeight: "600", fontSize: "0.875rem" }}>Lịch ngày mất</label>
            <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
              <label htmlFor="calendar-lunar" style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
                <input
                  id="calendar-lunar"
                  type="radio"
                  name="deathCalendar"
                  value="lunar"
                  checked={deathCalendar === "lunar"}
                  onChange={() => setDeathCalendar("lunar")}
                />
                <span>Âm lịch</span>
              </label>
              <label htmlFor="calendar-solar" style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
                <input
                  id="calendar-solar"
                  type="radio"
                  name="deathCalendar"
                  value="solar"
                  checked={deathCalendar === "solar"}
                  onChange={() => setDeathCalendar("solar")}
                />
                <span>Dương lịch</span>
              </label>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <div className="field">
              <label htmlFor="deathDay" style={{ fontSize: "0.875rem" }}>Ngày mất</label>
              <input
                id="deathDay"
                name="deathDay"
                type="number"
                min={1}
                max={31}
                value={deathDay}
                aria-invalid={fieldErrors.deathDay ? true : undefined}
                aria-describedby={describedBy("deathDay")}
                onChange={(e) => setDeathDay(e.target.value)}
              />
              {fieldErrors.deathDay && (
                <span id="deathDay-error" role="alert" className="field-error">
                  {fieldErrors.deathDay}
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="deathMonth" style={{ fontSize: "0.875rem" }}>Tháng mất</label>
              <input
                id="deathMonth"
                name="deathMonth"
                type="number"
                min={1}
                max={12}
                value={deathMonth}
                aria-invalid={fieldErrors.deathMonth ? true : undefined}
                aria-describedby={describedBy("deathMonth")}
                onChange={(e) => setDeathMonth(e.target.value)}
              />
              {fieldErrors.deathMonth && (
                <span id="deathMonth-error" role="alert" className="field-error">
                  {fieldErrors.deathMonth}
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="deathYear" style={{ fontSize: "0.875rem" }}>Năm mất (tùy chọn)</label>
              <input
                id="deathYear"
                name="deathYear"
                type="number"
                min={1000}
                value={deathYear}
                aria-invalid={fieldErrors.deathYear ? true : undefined}
                aria-describedby={describedBy("deathYear")}
                onChange={(e) => setDeathYear(e.target.value)}
              />
              {fieldErrors.deathYear && (
                <span id="deathYear-error" role="alert" className="field-error">
                  {fieldErrors.deathYear}
                </span>
              )}
            </div>
          </div>

          {deathCalendar === "lunar" && (
            <div className="field">
              <label htmlFor="deathLunarLeap" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
                <input
                  id="deathLunarLeap"
                  name="deathLunarLeap"
                  type="checkbox"
                  checked={deathLunarLeap}
                  onChange={(e) => setDeathLunarLeap(e.target.checked)}
                />
                <span>Tháng nhuận</span>
              </label>
            </div>
          )}

          {conversionPreview && (
            <div style={{ fontSize: "0.875rem", color: "var(--color-accent)", fontStyle: "italic", marginTop: "0.25rem" }}>
              {conversionPreview}
            </div>
          )}
        </div>
      )}

      {mode === "create" && persons.length > 0 && (
        <fieldset style={{ marginTop: "1.5rem", border: "1px dashed var(--color-hairline-strong)", borderRadius: "8px", padding: "1rem" }}>
          <legend style={{ padding: "0 0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "var(--color-muted)" }}>
            Thiết lập quan hệ (tùy chọn)
          </legend>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "normal", margin: 0, minHeight: "auto" }}>
              <input
                type="checkbox"
                checked={linkRelationship}
                onChange={(e) => setLinkRelationship(e.target.checked)}
              />
              <span>Thiết lập quan hệ ngay</span>
            </label>
          </div>

          {linkRelationship && (
            <>
              <div className="field" style={{ marginTop: "1rem" }}>
                <label htmlFor="relTargetId">Liên kết với thành viên</label>
                <select
                  id="relTargetId"
                  value={relTargetId}
                  onChange={(e) => setRelTargetId(e.target.value)}
                >
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="relDerivedKind">Quan hệ của thành viên mới</label>
                <select
                  id="relDerivedKind"
                  value={derivedKind}
                  onChange={(e) => setDerivedKind(e.target.value as "bloodline_father" | "bloodline_father_reverse" | "bloodline_mother" | "bloodline_mother_reverse" | "marriage")}
                >
                  <option value="bloodline_father">{sourceName} là CHA của {targetName}</option>
                  <option value="bloodline_father_reverse">{sourceName} là CON của {targetName} ({targetName} là CHA)</option>
                  <option value="bloodline_mother">{sourceName} là MẸ của {targetName}</option>
                  <option value="bloodline_mother_reverse">{sourceName} là CON của {targetName} ({targetName} là MẸ)</option>
                  <option value="marriage">{sourceName} và {targetName} là VỢ CHỒNG</option>
                </select>
              </div>

              {derivedKind === "marriage" && (
                <div className="field">
                  <label htmlFor="relMaritalStatus">Tình trạng hôn nhân</label>
                  <select
                    id="relMaritalStatus"
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value as "married" | "divorced" | "deceased")}
                  >
                    <option value="married">Đang kết hôn</option>
                    <option value="divorced">Đã ly hôn</option>
                    <option value="deceased">Đã mất</option>
                  </select>
                </div>
              )}
            </>
          )}
        </fieldset>
      )}

      <VisibilityToggles
        value={visibility}
        onChange={setVisibilityState}
        disabled={submitting}
      />

      <div className="form-actions">
        <Button type="submit" disabled={submitting} style={(onCancel && !hideCancelButton) ? { flex: 1 } : undefined}>
          {mode === "create" ? "Tạo" : "Lưu"}
        </Button>
        {onCancel && !hideCancelButton && (
          <Button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            Hủy bỏ
          </Button>
        )}
      </div>
    </form>
  );
}
