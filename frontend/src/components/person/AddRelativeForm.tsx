"use client";

import { useState, useEffect, type FormEvent } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  addAssertedRelative,
  addDerivedRelative,
  createRelativeWithPerson,
  convertSolarToLunar,
  convertLunarToSolar,
  type ConflictWarning as ConflictWarningData,
  type MaritalStatus,
} from "@/lib/persons";
import { uploadPhoto } from "@/lib/photos";
import { Button } from "@/components/Button";
import { FormControl, Input, Select } from "@/components/ui/FormControls";
import { ConflictWarning } from "./ConflictWarning";
import { LawfulBasisNotice } from "./LawfulBasisNotice";

/**
 * Add-relative UI offering two modes (Requirements 5.1, 5.2, 6.1):
 *
 * - DERIVED mode → a parent-child (Primitive_Bloodline_Edge) or spouse
 *   (Marriage_Edge) relationship, rendered as a SOLID line.
 * - ASSERTED mode → a direct kinship label (1-50 chars) without intermediate
 *   nodes, stored as an Asserted_Relationship and rendered as a DASHED line.
 *
 * After a derived (bloodline) edge is created, the relationship-create response
 * may carry upgrade conflict warnings (Requirement 7.5); these are surfaced via
 * {@link ConflictWarning}, displaying both the asserted label and the derived
 * term. Field-level errors from the error envelope are shown inline.
 */

export interface PersonOption {
  id: string;
  displayName: string;
  gender?: "male" | "female";
}

type Mode = "derived" | "asserted";

type DerivedKind =
  | "bloodline_father"
  | "bloodline_mother"
  | "bloodline_father_reverse"
  | "bloodline_mother_reverse"
  | "marriage";

type EditableMaritalStatus = Extract<MaritalStatus, "married" | "divorced">;

interface AddRelativeFormProps {
  treeId: string;
  /** Persons selectable as the relationship endpoints. */
  persons: PersonOption[];
  preselectedPersonId?: string;
  onCreated?: (relationshipId: string) => void;
  onCancel?: () => void;
  hideCancelButton?: boolean;
}

function parseOptionalInt(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function AddRelativeForm({ treeId, persons, preselectedPersonId, onCreated, onCancel, hideCancelButton = false }: AddRelativeFormProps) {
  const [mode, setMode] = useState<Mode>("derived");
  const [derivedKind, setDerivedKind] = useState<DerivedKind>("bloodline_father");
  const [maritalStatus, setMaritalStatus] = useState<EditableMaritalStatus>("married");
  
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [assertedLabel, setAssertedLabel] = useState("");

  // Sync with preselectedPersonId or persons list
  useEffect(() => {
    const initialSource = preselectedPersonId ?? persons[0]?.id ?? "";
    setSourceId(initialSource);
    
    const initialTarget = persons.find((p) => p.id !== initialSource)?.id ?? initialSource;
    setTargetId(initialTarget);
  }, [preselectedPersonId, persons]);

  // New relative creation state
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [newPersonPosition, setNewPersonPosition] = useState<"source" | "target">("target");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newGender, setNewGender] = useState<"male" | "female">("male");
  const [newBirthOrder, setNewBirthOrder] = useState("");
  const [newBirthYear, setNewBirthYear] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDeathStatus, setNewDeathStatus] = useState(false);
  const [newDeathDay, setNewDeathDay] = useState("");
  const [newDeathMonth, setNewDeathMonth] = useState("");
  const [newDeathYear, setNewDeathYear] = useState("");
  const [newDeathCalendar, setNewDeathCalendar] = useState<string>("lunar");
  const [newDeathLunarLeap, setNewDeathLunarLeap] = useState<boolean>(false);
  const [newConversionPreview, setNewConversionPreview] = useState<string>("");
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreviewUrl, setNewPhotoPreviewUrl] = useState<string | null>(null);

  const sourceName = isNewPerson && newPersonPosition === "source"
    ? (newDisplayName.trim() || "Thành viên mới")
    : (persons.find((p) => p.id === sourceId)?.displayName ?? "Người 1");

  const targetName = isNewPerson && newPersonPosition === "target"
    ? (newDisplayName.trim() || "Thành viên mới")
    : (persons.find((p) => p.id === targetId)?.displayName ?? "Người 2");

  useEffect(() => {
    if (!newDeathStatus || !newDeathDay || !newDeathMonth) {
      setNewConversionPreview("");
      return;
    }
    const day = Number(newDeathDay);
    const month = Number(newDeathMonth);
    const year = newDeathYear ? Number(newDeathYear) : new Date().getFullYear();

    if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12) {
      setNewConversionPreview("");
      return;
    }

    let active = true;
    if (newDeathCalendar === "lunar") {
      convertLunarToSolar(day, month, year, newDeathLunarLeap)
        .then((res) => {
          if (active) {
            setNewConversionPreview(`Tương đương Dương lịch: ${res.formatted}`);
          }
        })
        .catch(() => {
          if (active) setNewConversionPreview("Ngày Âm lịch không hợp lệ");
        });
    } else {
      convertSolarToLunar(day, month, year)
        .then((res) => {
          if (active) {
            setNewConversionPreview(`Tương đương Âm lịch: ${res.formatted}`);
          }
        })
        .catch(() => {
          if (active) setNewConversionPreview("Ngày Dương lịch không hợp lệ");
        });
    }
    return () => {
      active = false;
    };
  }, [newDeathStatus, newDeathDay, newDeathMonth, newDeathYear, newDeathCalendar, newDeathLunarLeap]);

  const [conflicts, setConflicts] = useState<ConflictWarningData[] | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto gender-assignment based on relationship type
  useEffect(() => {
    if (isNewPerson) {
      if (mode === "derived") {
        if (newPersonPosition === "source") {
          if (derivedKind === "bloodline_father") {
            setNewGender("male");
          } else if (derivedKind === "bloodline_mother") {
            setNewGender("female");
          } else if (derivedKind === "marriage") {
            // Pre-select opposite gender of target (existing spouse)
            const targetPerson = persons.find((p) => p.id === targetId);
            if (targetPerson?.gender) {
              setNewGender(targetPerson.gender === "male" ? "female" : "male");
            }
          }
        } else {
          // newPersonPosition === "target"
          if (derivedKind === "bloodline_father_reverse") {
            setNewGender("male");
          } else if (derivedKind === "bloodline_mother_reverse") {
            setNewGender("female");
          } else if (derivedKind === "marriage") {
            // Pre-select opposite gender of source (existing spouse)
            const sourcePerson = persons.find((p) => p.id === sourceId);
            if (sourcePerson?.gender) {
              setNewGender(sourcePerson.gender === "male" ? "female" : "male");
            }
          }
        }
      }
    }
  }, [isNewPerson, mode, derivedKind, newPersonPosition, sourceId, targetId, persons]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setConflicts(undefined);
    setSubmitting(true);

    try {
      if (isNewPerson) {
        if (!newDisplayName.trim()) {
          throw new Error("Vui lòng nhập họ và tên của người thân mới.");
        }

        let finalGender = newGender;
        if (mode === "derived") {
          if (newPersonPosition === "source") {
            if (derivedKind === "bloodline_father") finalGender = "male";
            if (derivedKind === "bloodline_mother") finalGender = "female";
          } else {
            // target
            if (derivedKind === "bloodline_father_reverse") finalGender = "male";
            if (derivedKind === "bloodline_mother_reverse") finalGender = "female";
          }
        }

        const order = parseOptionalInt(newBirthOrder);
        const year = parseOptionalInt(newBirthYear);
        const dDay = parseOptionalInt(newDeathDay);
        const dMonth = parseOptionalInt(newDeathMonth);
        const dYear = parseOptionalInt(newDeathYear);

        let finalType: "bloodline_father" | "bloodline_mother" | "marriage" | "asserted" = "asserted";
        let reversesEndpoints = false;
        if (mode === "derived") {
          if (derivedKind === "bloodline_father" || derivedKind === "bloodline_father_reverse") {
            finalType = "bloodline_father";
          } else if (derivedKind === "bloodline_mother" || derivedKind === "bloodline_mother_reverse") {
            finalType = "bloodline_mother";
          } else {
            finalType = "marriage";
          }
          reversesEndpoints = derivedKind === "bloodline_father_reverse" || derivedKind === "bloodline_mother_reverse";
        }
        const relationshipNewPersonPosition = reversesEndpoints
          ? (newPersonPosition === "source" ? "target" : "source")
          : newPersonPosition;
        const existingPersonId = newPersonPosition === "source" ? targetId : sourceId;

        const created = await createRelativeWithPerson({
          treeId,
          person: {
            displayName: newDisplayName.trim(),
            gender: finalGender,
            deathStatus: newDeathStatus,
            ...(newDeathStatus && dDay !== undefined && dMonth !== undefined ? {
              deathDay: dDay,
              deathMonth: dMonth,
              deathYear: dYear,
              deathCalendar: newDeathCalendar,
              deathLunarLeap: newDeathLunarLeap,
            } : {}),
            ...(order !== undefined ? { birthOrder: order } : {}),
            ...(year !== undefined ? { birthYear: year } : {}),
            ...(newPhone.trim() ? { phone: newPhone.trim() } : {}),
            ...(newEmail.trim() ? { email: newEmail.trim() } : {}),
          },
          relationship: {
            type: finalType,
            existingPersonId,
            newPersonPosition: relationshipNewPersonPosition,
            ...(finalType === "marriage" ? { maritalStatus } : {}),
            ...(finalType === "asserted" ? { assertedLabel } : {}),
          },
        });

        if (newPhotoFile) {
          try {
            await uploadPhoto(treeId, created.personId, newPhotoFile);
          } catch (uploadErr) {
            console.error("Failed to upload photo for new relative:", uploadErr);
          }
        }
        setConflicts(created.relationship.conflicts);
        onCreated?.(created.relationship.id);
        return;
      }

      if (mode === "derived") {
        let finalType: "bloodline_father" | "bloodline_mother" | "marriage" = "bloodline_father";
        let finalSourceId = sourceId;
        let finalTargetId = targetId;

        if (derivedKind === "bloodline_father") {
          finalType = "bloodline_father";
        } else if (derivedKind === "bloodline_father_reverse") {
          finalType = "bloodline_father";
          finalSourceId = targetId;
          finalTargetId = sourceId;
        } else if (derivedKind === "bloodline_mother") {
          finalType = "bloodline_mother";
        } else if (derivedKind === "bloodline_mother_reverse") {
          finalType = "bloodline_mother";
          finalSourceId = targetId;
          finalTargetId = sourceId;
        } else if (derivedKind === "marriage") {
          finalType = "marriage";
        }

        const result = await addDerivedRelative({
          treeId,
          type: finalType,
          sourceId: finalSourceId,
          targetId: finalTargetId,
          ...(derivedKind === "marriage" ? { maritalStatus } : {}),
        });
        setConflicts(result.conflicts);
        onCreated?.(result.id);
      } else {
        const result = await addAssertedRelative({
          treeId,
          sourceId,
          targetId,
          assertedLabel,
        });
        setConflicts(result.conflicts);
        onCreated?.(result.id);
      }
    } catch (error) {
      if (error instanceof ApiError && error.field) {
        setFieldErrors({ [error.field]: error.message });
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Không thể thêm quan hệ. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Determine if gender field should be read-only based on relationship type
  const isGenderFixed =
    mode === "derived" &&
    ((newPersonPosition === "source" &&
      (derivedKind === "bloodline_father" || derivedKind === "bloodline_mother")) ||
     (newPersonPosition === "target" &&
      (derivedKind === "bloodline_father_reverse" || derivedKind === "bloodline_mother_reverse")));

  return (
    <form onSubmit={handleSubmit} aria-label="Thêm người thân">
      {formError ? (
        <p role="alert" data-testid="form-error" className="form-error">
          {formError}
        </p>
      ) : null}

      <LawfulBasisNotice />

      <fieldset>
        <legend>Kiểu kết nối</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label htmlFor="mode-derived" style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
            <input
              id="mode-derived"
              type="radio"
              name="mode"
              value="derived"
              checked={mode === "derived"}
              onChange={() => setMode("derived")}
            />
            {" Quan hệ trực tiếp — cha/mẹ, con, vợ/chồng"}
          </label>
          <label htmlFor="mode-asserted" style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
            <input
              id="mode-asserted"
              type="radio"
              name="mode"
              value="asserted"
              checked={mode === "asserted"}
              onChange={() => setMode("asserted")}
            />
            {" Quan hệ khác — cần tự điền tên gọi"}
          </label>
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="isNewPerson" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
          <input
            id="isNewPerson"
            type="checkbox"
            checked={isNewPerson}
            onChange={(e) => setIsNewPerson(e.target.checked)}
          />
          <span>Thêm người thân mới vào cây</span>
        </label>
      </div>

      {isNewPerson && (
        <div className="field">
          <label htmlFor="newPersonPosition">Thành viên mới đóng vai trò là</label>
          <select
            id="newPersonPosition"
            value={newPersonPosition}
            onChange={(e) => setNewPersonPosition(e.target.value as "source" | "target")}
          >
            <option value="target">Con cái / Vai vế thấp hơn (ví dụ: thêm Con)</option>
            <option value="source">Cha mẹ / Vai vế cao hơn (ví dụ: thêm Cha, Mẹ)</option>
          </select>
        </div>
      )}

      {(!isNewPerson || newPersonPosition !== "source") && (
        <FormControl id="sourceId" label="Người thứ nhất">
          <Select
            id="sourceId"
            name="sourceId"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          >
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </Select>
        </FormControl>
      )}

      {(!isNewPerson || newPersonPosition !== "target") && (
        <FormControl id="targetId" label="Người thứ hai">
          <Select
            id="targetId"
            name="targetId"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </Select>
        </FormControl>
      )}

      {mode === "derived" ? (
        <>
          <FormControl id="derivedKind" label="Loại quan hệ suy ra">
            <Select
              id="derivedKind"
              name="derivedKind"
              value={derivedKind}
              onChange={(e) => setDerivedKind(e.target.value as DerivedKind)}
            >
              <option value="bloodline_father">{sourceName} là CHA của {targetName}</option>
              <option value="bloodline_father_reverse">{sourceName} là CON của {targetName} ({targetName} là CHA)</option>
              <option value="bloodline_mother">{sourceName} là MẸ của {targetName}</option>
              <option value="bloodline_mother_reverse">{sourceName} là CON của {targetName} ({targetName} là MẸ)</option>
              <option value="marriage">{sourceName} và {targetName} là VỢ CHỒNG</option>
            </Select>
          </FormControl>
          {derivedKind === "marriage" ? (
            <FormControl id="maritalStatus" label="Tình trạng hôn nhân">
              <Select
                id="maritalStatus"
                name="maritalStatus"
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value as EditableMaritalStatus)}
              >
                <option value="married">Đã kết hôn</option>
                <option value="divorced">Đã ly dị</option>
              </Select>
            </FormControl>
          ) : null}
        </>
      ) : (
        <FormControl id="assertedLabel" label="Nhãn xưng hô (1-50 ký tự)" error={fieldErrors.assertedLabel} required>
          <Input
            id="assertedLabel"
            name="assertedLabel"
            type="text"
            value={assertedLabel}
            required
            maxLength={50}
            error={fieldErrors.assertedLabel}
            onChange={(e) => setAssertedLabel(e.target.value)}
          />
        </FormControl>
      )}

      {isNewPerson && (
        <fieldset style={{ marginTop: "1rem" }}>
          <legend>Thông tin người mới</legend>

          <FormControl id="newDisplayName" label="Họ và tên" required>
            <Input
              id="newDisplayName"
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              required
            />
          </FormControl>

          <div className="field">
            <label>Giới tính</label>
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: isGenderFixed ? "not-allowed" : "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
                <input
                  type="radio"
                  name="newGender"
                  value="male"
                  checked={newGender === "male"}
                  disabled={isGenderFixed}
                  onChange={() => setNewGender("male")}
                />
                Nam
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: isGenderFixed ? "not-allowed" : "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
                <input
                  type="radio"
                  name="newGender"
                  value="female"
                  checked={newGender === "female"}
                  disabled={isGenderFixed}
                  onChange={() => setNewGender("female")}
                />
                Nữ
              </label>
            </div>
            {isGenderFixed && (
              <p className="field-hint" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                Giới tính được tự động khóa theo loại quan hệ.
              </p>
            )}
          </div>

          <FormControl id="newBirthOrder" label="Thứ tự sinh (tùy chọn)">
            <Input
              id="newBirthOrder"
              type="number"
              min={1}
              max={99}
              value={newBirthOrder}
              onChange={(e) => setNewBirthOrder(e.target.value)}
            />
            <p className="field-hint" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
              Số 1 = con đầu lòng (miền Nam gọi là Anh/Chị Hai).
            </p>
          </FormControl>

          <FormControl id="newBirthYear" label="Năm sinh (tùy chọn)">
            <Input
              id="newBirthYear"
              type="number"
              min={1000}
              value={newBirthYear}
              onChange={(e) => setNewBirthYear(e.target.value)}
            />
          </FormControl>

          <FormControl id="newPhone" label="Số điện thoại (tùy chọn)">
            <Input
              id="newPhone"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </FormControl>

          <FormControl id="newEmail" label="Email (tùy chọn)">
            <Input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </FormControl>

          <div className="field photo-upload-container">
            <input
              id="newPhoto"
              type="file"
              accept="image/jpeg,image/png"
              className="photo-upload-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setNewPhotoFile(file);
                  setNewPhotoPreviewUrl(URL.createObjectURL(file));
                } else {
                  setNewPhotoFile(null);
                  setNewPhotoPreviewUrl(null);
                }
              }}
            />
            <label htmlFor="newPhoto" className="photo-upload-zone">
              <span className="photo-upload-zone__icon">📤</span>
              <span className="photo-upload-zone__title">
                {newPhotoFile ? `Đã chọn: ${newPhotoFile.name}` : "Hình ảnh đại diện (tùy chọn)"}
              </span>
              <span className="photo-upload-zone__subtitle">Kéo thả file hoặc click để chọn ảnh đại diện</span>
            </label>
            {newPhotoPreviewUrl && (
              <div style={{ marginTop: "0.5rem" }}>
                <img
                  src={newPhotoPreviewUrl}
                  alt="Xem trước ảnh"
                  style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--color-hairline)" }}
                />
              </div>
            )}
          </div>

          <div className="field">
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
              <input
                type="checkbox"
                checked={newDeathStatus}
                onChange={(e) => setNewDeathStatus(e.target.checked)}
              />
              <span>Đã mất</span>
            </label>
          </div>

          {newDeathStatus && (
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
                  <label htmlFor="new-calendar-lunar" style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
                    <input
                      id="new-calendar-lunar"
                      type="radio"
                      name="newDeathCalendar"
                      value="lunar"
                      checked={newDeathCalendar === "lunar"}
                      onChange={() => setNewDeathCalendar("lunar")}
                    />
                    <span>Âm lịch</span>
                  </label>
                  <label htmlFor="new-calendar-solar" style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
                    <input
                      id="new-calendar-solar"
                      type="radio"
                      name="newDeathCalendar"
                      value="solar"
                      checked={newDeathCalendar === "solar"}
                      onChange={() => setNewDeathCalendar("solar")}
                    />
                    <span>Dương lịch</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <FormControl id="newDeathDay" label="Ngày mất" error={fieldErrors.newDeathDay}>
                  <Input
                    id="newDeathDay"
                    name="newDeathDay"
                    type="number"
                    min={1}
                    max={31}
                    value={newDeathDay}
                    error={fieldErrors.newDeathDay}
                    onChange={(e) => setNewDeathDay(e.target.value)}
                  />
                </FormControl>

                <FormControl id="newDeathMonth" label="Tháng mất" error={fieldErrors.newDeathMonth}>
                  <Input
                    id="newDeathMonth"
                    name="newDeathMonth"
                    type="number"
                    min={1}
                    max={12}
                    value={newDeathMonth}
                    error={fieldErrors.newDeathMonth}
                    onChange={(e) => setNewDeathMonth(e.target.value)}
                  />
                </FormControl>

                <FormControl id="newDeathYear" label="Năm mất (tùy chọn)" error={fieldErrors.newDeathYear}>
                  <Input
                    id="newDeathYear"
                    name="newDeathYear"
                    type="number"
                    min={1000}
                    value={newDeathYear}
                    error={fieldErrors.newDeathYear}
                    onChange={(e) => setNewDeathYear(e.target.value)}
                  />
                </FormControl>
              </div>

              {newDeathCalendar === "lunar" && (
                <div className="field">
                  <label htmlFor="newDeathLunarLeap" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "normal", color: "var(--color-muted)", minHeight: "auto" }}>
                    <input
                      id="newDeathLunarLeap"
                      name="newDeathLunarLeap"
                      type="checkbox"
                      checked={newDeathLunarLeap}
                      onChange={(e) => setNewDeathLunarLeap(e.target.checked)}
                    />
                    <span>Tháng nhuận</span>
                  </label>
                </div>
              )}

              {newConversionPreview && (
                <div style={{ fontSize: "0.875rem", color: "var(--color-accent)", fontStyle: "italic", marginTop: "0.25rem" }}>
                  {newConversionPreview}
                </div>
              )}
            </div>
          )}
        </fieldset>
      )}

      <div className="form-actions">
        <Button
          type="submit"
          loading={submitting}
          loadingLabel={isNewPerson ? "Đang thêm…" : "Đang tạo kết nối…"}
          style={(onCancel && !hideCancelButton) ? { flex: 1 } : undefined}
        >
          {isNewPerson ? "Thêm thành viên mới" : "Thêm kết nối"}
        </Button>
        {onCancel && !hideCancelButton && (
          <Button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            Hủy
          </Button>
        )}
      </div>

      <ConflictWarning conflicts={conflicts} />
    </form>
  );
}
