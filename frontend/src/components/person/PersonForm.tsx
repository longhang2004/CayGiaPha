"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  createPerson,
  createRelativeWithPerson,
  editPerson,
  convertSolarToLunar,
  convertLunarToSolar,
  updateRelationship,
  type CreatePersonInput,
  type EditPersonInput,
  type Gender,
  type MaritalStatus,
} from "@/lib/persons";
import { type PersonOption } from "./AddRelativeForm";
import { Button } from "@/components/Button";
import { uploadPhoto } from "@/lib/photos";
import { FormControl, Input, Select } from "@/components/ui/FormControls";
import { LawfulBasisNotice } from "./LawfulBasisNotice";
import { trackUxEvent, getUxViewportClass } from "@/lib/analytics/uxEvents";

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
  spouseRelationship?: {
    relationshipId: string;
    spouseId: string;
    maritalStatus?: MaritalStatus | string | null;
  };
}

type EditableMaritalStatus = Extract<MaritalStatus, "married" | "divorced">;

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
  spouseRelationship,
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
  const [linkRelationship, setLinkRelationship] = useState(false);
  const [relTargetId, setRelTargetId] = useState(persons[0]?.id ?? "");
  const [derivedKind, setDerivedKind] = useState<
    "bloodline_father" | "bloodline_father_reverse" | "bloodline_mother" | "bloodline_mother_reverse" | "marriage"
  >("bloodline_father");
  const [maritalStatus, setMaritalStatus] = useState<EditableMaritalStatus>("married");
  const [spouseMaritalStatus, setSpouseMaritalStatus] = useState<EditableMaritalStatus>(
    spouseRelationship?.maritalStatus === "divorced" ? "divorced" : "married",
  );

  useEffect(() => {
    if (persons.length > 0 && !relTargetId) {
      setRelTargetId(persons[0].id);
    }
  }, [persons, relTargetId]);

  useEffect(() => {
    setSpouseMaritalStatus(spouseRelationship?.maritalStatus === "divorced" ? "divorced" : "married");
  }, [spouseRelationship?.spouseId, spouseRelationship?.maritalStatus]);

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
  const isSubmittingRef = useRef(false);
  const [showSubmitReview, setShowSubmitReview] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const isFirstPerson = mode === "create" && persons.length === 0;
  const flowName = mode === "edit" ? "edit_person" : isFirstPerson ? "add_first_person" : "add_relative";
  const surface = isFirstPerson ? "tree_empty" : "person_form";

  const isDirty =
    displayName !== (initialValues?.displayName ?? "") ||
    gender !== (initialValues?.gender ?? "male") ||
    birthOrder !== (initialValues?.birthOrder != null ? String(initialValues.birthOrder) : "") ||
    birthYear !== (initialValues?.birthYear != null ? String(initialValues.birthYear) : "") ||
    phone !== (initialValues?.phone ?? "") ||
    email !== (initialValues?.email ?? "") ||
    deathStatus !== (initialValues?.deathStatus ?? false) ||
    deathDay !== (initialValues?.deathDay != null ? String(initialValues.deathDay) : "") ||
    deathMonth !== (initialValues?.deathMonth != null ? String(initialValues.deathMonth) : "") ||
    deathYear !== (initialValues?.deathYear != null ? String(initialValues.deathYear) : "") ||
    deathCalendar !== (initialValues?.deathCalendar ?? "lunar") ||
    deathLunarLeap !== (initialValues?.deathLunarLeap ?? false) ||
    photoFile !== null ||
    (mode === "create" && (
      linkRelationship !== false ||
      relTargetId !== (persons[0]?.id ?? "") ||
      derivedKind !== "bloodline_father" ||
      maritalStatus !== "married"
    )) ||
    (mode === "edit" && spouseRelationship && (
      spouseMaritalStatus !== (spouseRelationship?.maritalStatus === "divorced" ? "divorced" : "married")
    ));

  function handleCancelClick() {
    trackUxEvent("ux_core_flow_error", {
      flow: flowName,
      surface,
      viewportClass: getUxViewportClass(),
      accessRole: "unknown",
      outcome: "cancelled"
    });
    if (isDirty && !showDiscardConfirm) {
      setShowDiscardConfirm(true);
    } else {
      onCancel?.();
    }
  }

  function describedBy(field: string): string | undefined {
    return fieldErrors[field] ? `${field}-error` : undefined;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowSubmitReview(true);
  }

  async function handleConfirmSubmit() {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    const order = parseOptionalInt(birthOrder);
    const year = parseOptionalInt(birthYear);
    const dDay = parseOptionalInt(deathDay);
    const dMonth = parseOptionalInt(deathMonth);
    const dYear = parseOptionalInt(deathYear);

    trackUxEvent("ux_core_flow_start", { flow: flowName, surface, viewportClass: getUxViewportClass(), accessRole: "unknown", outcome: "started" });

    try {
      let resolvedId = personId;

      if (mode === "create") {
        const personBody: Omit<CreatePersonInput, "treeId"> = {
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
        if (linkRelationship && relTargetId) {
          let finalType: "bloodline_father" | "bloodline_mother" | "marriage" = "bloodline_father";
          let newPersonPosition: "source" | "target" = "source";
          if (derivedKind === "bloodline_father_reverse") {
            finalType = "bloodline_father";
            newPersonPosition = "target";
          } else if (derivedKind === "bloodline_mother") {
            finalType = "bloodline_mother";
          } else if (derivedKind === "bloodline_mother_reverse") {
            finalType = "bloodline_mother";
            newPersonPosition = "target";
          } else if (derivedKind === "marriage") {
            finalType = "marriage";
          }
          const created = await createRelativeWithPerson({
            treeId,
            person: personBody,
            relationship: {
              type: finalType,
              existingPersonId: relTargetId,
              newPersonPosition,
              ...(finalType === "marriage" ? { maritalStatus } : {}),
            },
          });
          resolvedId = created.personId;
        } else {
          const created = await createPerson({ treeId, ...personBody });
          resolvedId = created.id;
        }
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

        if (spouseRelationship && spouseMaritalStatus !== (spouseRelationship.maritalStatus === "divorced" ? "divorced" : "married")) {
          await updateRelationship(spouseRelationship.relationshipId, treeId, {
            maritalStatus: spouseMaritalStatus,
          });
        }
      }

      // Upload photo if selected
      if (photoFile && resolvedId) {
        try {
          await uploadPhoto(treeId, resolvedId, photoFile);
        } catch (uploadErr) {
          console.error("Failed to upload photo.");
          // Don't fail the whole form submit if photo fails, just warn
          alert("Lưu thông tin thành công nhưng không thể tải ảnh lên: " + (uploadErr instanceof Error ? uploadErr.message : ""));
        }
      }

      setShowSubmitReview(false);
      trackUxEvent("ux_core_flow_complete", { flow: flowName, surface, viewportClass: getUxViewportClass(), accessRole: "unknown", outcome: "completed" });
      if (resolvedId) {
        onSuccess?.(resolvedId);
      }
    } catch (error) {
      setShowSubmitReview(false);
      if (error instanceof ApiError && error.field) {
        setFieldErrors({ [error.field]: error.message });
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Không thể lưu. Vui lòng thử lại.");
      }
      trackUxEvent("ux_core_flow_error", { flow: flowName, surface, viewportClass: getUxViewportClass(), accessRole: "unknown", outcome: "request_error" });
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  }


  if (showDiscardConfirm) {
    return (
      <div className="person-form-discard-confirm">
        <h3>Hủy bỏ thay đổi?</h3>
        <p>Các thông tin bạn vừa nhập sẽ không được lưu lại.</p>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button type="button" className="btn btn-secondary" onClick={() => {
            trackUxEvent("ux_recovery_used", { flow: flowName, surface, viewportClass: getUxViewportClass(), accessRole: "unknown", outcome: "retry" });
            setShowDiscardConfirm(false);
          }}>Tiếp tục chỉnh sửa</button>
          <button type="button" className="btn btn-primary btn-terracotta" onClick={() => onCancel?.()}>Xác nhận hủy</button>
        </div>
      </div>
    );
  }

  if (showSubmitReview) {
    const isFirstPerson = mode === "create" && persons.length === 0;

    let reviewMessage = "";
    let subReviewMessage = "";
    if (mode === "edit") {
      reviewMessage = `Bạn đang cập nhật thông tin của ${displayName}.`;
      if (spouseRelationship && spouseMaritalStatus !== (spouseRelationship.maritalStatus === "divorced" ? "divorced" : "married")) {
        reviewMessage += ` Tình trạng hôn nhân sẽ được thay đổi thành: ${spouseMaritalStatus === "divorced" ? "Đã ly dị" : "Đã kết hôn"}.`;
      }
    } else if (isFirstPerson) {
      reviewMessage = `Bạn đang tạo người đầu tiên trong cây gia phả: ${displayName}.`;
    } else {
      reviewMessage = `Bạn đang thêm thành viên mới: ${displayName}.`;
      if (linkRelationship && relTargetId) {
        const relationLabel =
          derivedKind === "bloodline_father" ? `${displayName} là CHA của ${targetName}` :
          derivedKind === "bloodline_father_reverse" ? `${displayName} là CON của ${targetName} (${targetName} là CHA)` :
          derivedKind === "bloodline_mother" ? `${displayName} là MẸ của ${targetName}` :
          derivedKind === "bloodline_mother_reverse" ? `${displayName} là CON của ${targetName} (${targetName} là MẸ)` :
          derivedKind === "marriage" ? `${displayName} và ${targetName} là VỢ CHỒNG` : "";
        subReviewMessage = `Thiết lập quan hệ: ${relationLabel}`;
      }
    }

    return (
      <div className="person-form-review">
        <h3>Xác nhận lưu thông tin</h3>
        <p>{reviewMessage}</p>
        {subReviewMessage && <p><strong>{subReviewMessage}</strong></p>}
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => {
            trackUxEvent("ux_recovery_used", { flow: flowName, surface, viewportClass: getUxViewportClass(), accessRole: "unknown", outcome: "retry" });
            setShowSubmitReview(false);
          }}>Quay lại chỉnh sửa</button>
          <button type="button" className="btn btn-primary btn-terracotta" disabled={submitting} onClick={handleConfirmSubmit}>
            {submitting ? "Đang lưu..." : "Xác nhận lưu"}
          </button>
        </div>
        {formError && <p className="form-error" style={{ marginTop: "1rem" }}>{formError}</p>}
      </div>
    );
  }
return (
    <form onSubmit={handleSubmit} aria-label={mode === "create" ? "Thêm thành viên mới" : "Chỉnh sửa thông tin thành viên"}>
      {formError ? (
        <p id="person-form-error" role="alert" className="form-error" style={{ marginBottom: "1rem" }}>
          {formError}
        </p>
      ) : null}

      <LawfulBasisNotice />

      <FormControl id="displayName" label="Họ và tên" error={fieldErrors.displayName} required>
        <Input
          id="displayName"
          name="displayName"
          type="text"
          value={displayName}
          error={fieldErrors.displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          disabled={submitting}
        />
      </FormControl>

      <FormControl id="gender" label="Giới tính" error={fieldErrors.gender}>
        <Select
          id="gender"
          name="gender"
          value={gender}
          error={fieldErrors.gender}
          onChange={(e) => setGender(e.target.value as Gender)}
          disabled={submitting}
        >
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
        </Select>
      </FormControl>

      <FormControl id="birthYear" label="Năm sinh (tùy chọn)" error={fieldErrors.birthYear}>
        <Input
          id="birthYear"
          name="birthYear"
          type="number"
          min={1000}
          value={birthYear}
          error={fieldErrors.birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          disabled={submitting}
        />
      </FormControl>

      <FormControl id="birthOrder" label="Thứ tự sinh (tùy chọn)" error={fieldErrors.birthOrder}>
        <Input
          id="birthOrder"
          name="birthOrder"
          type="number"
          min={1}
          max={99}
          value={birthOrder}
          error={fieldErrors.birthOrder}
          onChange={(e) => setBirthOrder(e.target.value)}
          disabled={submitting}
        />
        <p className="field-hint" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
          Số 1 = con đầu lòng (miền Nam gọi là Anh/Chị Hai).
        </p>
      </FormControl>

      <div className="field">
        <label htmlFor="deathStatus" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
          <input
            id="deathStatus"
            name="deathStatus"
            type="checkbox"
            checked={deathStatus}
            onChange={(e) => setDeathStatus(e.target.checked)}
            disabled={submitting}
          />
          <span>Đã qua đời</span>
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
            <label style={{ fontWeight: "600", fontSize: "0.875rem" }}>Nhập theo lịch</label>
            <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
              <label htmlFor="calendar-lunar" style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
                <input
                  id="calendar-lunar"
                  type="radio"
                  name="deathCalendar"
                  value="lunar"
                  checked={deathCalendar === "lunar"}
                  onChange={() => setDeathCalendar("lunar")}
                  disabled={submitting}
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
                  disabled={submitting}
                />
                <span>Dương lịch</span>
              </label>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <FormControl id="deathDay" label="Ngày mất" error={fieldErrors.deathDay}>
              <Input
                id="deathDay"
                name="deathDay"
                type="number"
                min={1}
                max={31}
                value={deathDay}
                error={fieldErrors.deathDay}
                onChange={(e) => setDeathDay(e.target.value)}
                disabled={submitting}
              />
            </FormControl>

            <FormControl id="deathMonth" label="Tháng mất" error={fieldErrors.deathMonth}>
              <Input
                id="deathMonth"
                name="deathMonth"
                type="number"
                min={1}
                max={12}
                value={deathMonth}
                error={fieldErrors.deathMonth}
                onChange={(e) => setDeathMonth(e.target.value)}
                disabled={submitting}
              />
            </FormControl>

            <FormControl id="deathYear" label="Năm mất (tùy chọn)" error={fieldErrors.deathYear}>
              <Input
                id="deathYear"
                name="deathYear"
                type="number"
                min={1000}
                value={deathYear}
                error={fieldErrors.deathYear}
                onChange={(e) => setDeathYear(e.target.value)}
                disabled={submitting}
              />
            </FormControl>
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

      <FormControl id="phone" label="Số điện thoại (tùy chọn)">
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={submitting}
        />
      </FormControl>

      <FormControl id="email" label="Email (tùy chọn)">
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
      </FormControl>

      <div className="field photo-upload-container">
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png"
          className="photo-upload-input"
          disabled={submitting}
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
                disabled={submitting}
              />
              <span>Thiết lập quan hệ ngay</span>
            </label>
          </div>

          {linkRelationship && (
            <>
              <FormControl id="relTargetId" label="Liên kết với thành viên">
                <Select
                  id="relTargetId"
                  value={relTargetId}
                  onChange={(e) => setRelTargetId(e.target.value)}
                  disabled={submitting}
                >
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl id="relDerivedKind" label="Quan hệ của thành viên mới">
                <Select
                  id="relDerivedKind"
                  value={derivedKind}
                  onChange={(e) => setDerivedKind(e.target.value as "bloodline_father" | "bloodline_father_reverse" | "bloodline_mother" | "bloodline_mother_reverse" | "marriage")}
                  disabled={submitting}
                >
                  <option value="bloodline_father">{sourceName} là CHA của {targetName}</option>
                  <option value="bloodline_father_reverse">{sourceName} là CON của {targetName} ({targetName} là CHA)</option>
                  <option value="bloodline_mother">{sourceName} là MẸ của {targetName}</option>
                  <option value="bloodline_mother_reverse">{sourceName} là CON của {targetName} ({targetName} là MẸ)</option>
                  <option value="marriage">{sourceName} và {targetName} là VỢ CHỒNG</option>
                </Select>
              </FormControl>

              {derivedKind === "marriage" && (
                <FormControl id="relMaritalStatus" label="Tình trạng hôn nhân">
                  <Select
                    id="relMaritalStatus"
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value as EditableMaritalStatus)}
                    disabled={submitting}
                  >
                    <option value="married">Đã kết hôn</option>
                    <option value="divorced">Đã ly dị</option>
                  </Select>
                </FormControl>
              )}
            </>
          )}
        </fieldset>
      )}

      {mode === "edit" && spouseRelationship ? (
        <FormControl id="spouseMaritalStatus" label="Tình trạng hôn nhân">
          <Select
            id="spouseMaritalStatus"
            value={spouseMaritalStatus}
            onChange={(e) => setSpouseMaritalStatus(e.target.value as EditableMaritalStatus)}
            disabled={submitting}
          >
            <option value="married">Đã kết hôn</option>
            <option value="divorced">Đã ly dị</option>
          </Select>
        </FormControl>
      ) : null}

      <div className="form-actions">
        <Button
          type="submit"
          loading={submitting}
          loadingLabel={mode === "create" ? "Đang lưu…" : "Đang cập nhật…"}
          style={(onCancel && !hideCancelButton) ? { flex: 1 } : undefined}
        >
          {mode === "create" ? "Lưu thành viên" : "Cập nhật thông tin"}
        </Button>
        {onCancel && !hideCancelButton && (
          <Button
            type="button"
            className="btn-secondary"
            onClick={handleCancelClick}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            Hủy
          </Button>
        )}
      </div>
    </form>
  );
}
