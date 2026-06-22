"use client";

import { useState, useEffect, type FormEvent } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  addAssertedRelative,
  addDerivedRelative,
  createPerson,
  type ConflictWarning as ConflictWarningData,
  type DerivedRelativeInput,
  type MaritalStatus,
} from "@/lib/persons";
import { uploadPhoto } from "@/lib/photos";
import { Button } from "@/components/Button";
import { ConflictWarning } from "./ConflictWarning";

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

interface AddRelativeFormProps {
  treeId: string;
  /** Persons selectable as the relationship endpoints. */
  persons: PersonOption[];
  preselectedPersonId?: string;
  onCreated?: (relationshipId: string) => void;
}

function parseOptionalInt(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function AddRelativeForm({ treeId, persons, preselectedPersonId, onCreated }: AddRelativeFormProps) {
  const [mode, setMode] = useState<Mode>("derived");
  const [derivedKind, setDerivedKind] = useState<DerivedKind>("bloodline_father");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>("married");
  
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
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreviewUrl, setNewPhotoPreviewUrl] = useState<string | null>(null);

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
      let activeSourceId = sourceId;
      let activeTargetId = targetId;

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

        // 1. Create the new person
        const created = await createPerson({
          displayName: newDisplayName.trim(),
          gender: finalGender,
          deathStatus: newDeathStatus,
          ...(order !== undefined ? { birthOrder: order } : {}),
          ...(year !== undefined ? { birthYear: year } : {}),
          ...(newPhone.trim() ? { phone: newPhone.trim() } : {}),
          ...(newEmail.trim() ? { email: newEmail.trim() } : {}),
        });

        // 2. Upload photo if selected
        if (newPhotoFile) {
          try {
            await uploadPhoto(treeId, created.id, newPhotoFile);
          } catch (uploadErr) {
            console.error("Failed to upload photo for new relative:", uploadErr);
          }
        }

        // 3. Assign ID
        if (newPersonPosition === "source") {
          activeSourceId = created.id;
        } else {
          activeTargetId = created.id;
        }
      }

      // 4. Create relationship
      if (mode === "derived") {
        let finalType: "bloodline_father" | "bloodline_mother" | "marriage" = "bloodline_father";
        let finalSourceId = activeSourceId;
        let finalTargetId = activeTargetId;

        if (derivedKind === "bloodline_father") {
          finalType = "bloodline_father";
        } else if (derivedKind === "bloodline_father_reverse") {
          finalType = "bloodline_father";
          finalSourceId = activeTargetId;
          finalTargetId = activeSourceId;
        } else if (derivedKind === "bloodline_mother") {
          finalType = "bloodline_mother";
        } else if (derivedKind === "bloodline_mother_reverse") {
          finalType = "bloodline_mother";
          finalSourceId = activeTargetId;
          finalTargetId = activeSourceId;
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
          sourceId: activeSourceId,
          targetId: activeTargetId,
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

      <fieldset>
        <legend>Kiểu quan hệ</legend>
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
            {" Quan hệ suy ra (nét liền)"}
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
            {" Quan hệ khai báo (nét đứt)"}
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
          <span>Tạo và kết nối thành viên mới</span>
        </label>
      </div>

      {isNewPerson && (
        <div className="field">
          <label htmlFor="newPersonPosition">Người mới là</label>
          <select
            id="newPersonPosition"
            value={newPersonPosition}
            onChange={(e) => setNewPersonPosition(e.target.value as "source" | "target")}
          >
            <option value="source">Người bắt đầu (Từ người)</option>
            <option value="target">Người kết thúc (Đến người)</option>
          </select>
        </div>
      )}

      {(!isNewPerson || newPersonPosition !== "source") && (
        <div className="field">
          <label htmlFor="sourceId">Từ người</label>
          <select
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
          </select>
        </div>
      )}

      {(!isNewPerson || newPersonPosition !== "target") && (
        <div className="field">
          <label htmlFor="targetId">Đến người</label>
          <select
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
          </select>
        </div>
      )}

      {mode === "derived" ? (
        <>
          <div className="field">
            <label htmlFor="derivedKind">Loại quan hệ suy ra</label>
            <select
              id="derivedKind"
              name="derivedKind"
              value={derivedKind}
              onChange={(e) => setDerivedKind(e.target.value as DerivedKind)}
            >
              <option value="bloodline_father">Từ người là CHA của Đến người</option>
              <option value="bloodline_father_reverse">Từ người là CON của Đến người (Đến người là CHA)</option>
              <option value="bloodline_mother">Từ người là MẸ của Đến người</option>
              <option value="bloodline_mother_reverse">Từ người là CON của Đến người (Đến người là MẸ)</option>
              <option value="marriage">Từ người và Đến người là VỢ CHỒNG</option>
            </select>
          </div>
          {derivedKind === "marriage" ? (
            <div className="field">
              <label htmlFor="maritalStatus">Tình trạng hôn nhân</label>
              <select
                id="maritalStatus"
                name="maritalStatus"
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus)}
              >
                <option value="married">Đang kết hôn</option>
                <option value="divorced">Đã ly hôn</option>
                <option value="deceased">Đã mất</option>
              </select>
            </div>
          ) : null}
        </>
      ) : (
        <div className="field">
          <label htmlFor="assertedLabel">Nhãn xưng hô (1-50 ký tự)</label>
          <input
            id="assertedLabel"
            name="assertedLabel"
            type="text"
            value={assertedLabel}
            required
            maxLength={50}
            aria-invalid={fieldErrors.assertedLabel ? true : undefined}
            aria-describedby={fieldErrors.assertedLabel ? "assertedLabel-error" : undefined}
            onChange={(e) => setAssertedLabel(e.target.value)}
          />
          {fieldErrors.assertedLabel ? (
            <span id="assertedLabel-error" role="alert" className="field-error">
              {fieldErrors.assertedLabel}
            </span>
          ) : null}
        </div>
      )}

      {isNewPerson && (
        <fieldset style={{ marginTop: "1rem" }}>
          <legend>Thông tin người mới</legend>

          <div className="field">
            <label htmlFor="newDisplayName">Họ và tên</label>
            <input
              id="newDisplayName"
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              required
            />
          </div>

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

          <div className="field">
            <label htmlFor="newBirthOrder">Thứ tự sinh (tùy chọn)</label>
            <input
              id="newBirthOrder"
              type="number"
              min={1}
              max={99}
              value={newBirthOrder}
              onChange={(e) => setNewBirthOrder(e.target.value)}
            />
            <p className="field-hint" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
              Lưu ý: Người sinh thứ 1 (đầu lòng) là con cả/Anh Hai/Chị Hai (nhập số 1).
            </p>
          </div>

          <div className="field">
            <label htmlFor="newBirthYear">Năm sinh (tùy chọn)</label>
            <input
              id="newBirthYear"
              type="number"
              min={1000}
              value={newBirthYear}
              onChange={(e) => setNewBirthYear(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="newPhone">Số điện thoại (tùy chọn)</label>
            <input
              id="newPhone"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="newEmail">Email (tùy chọn)</label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="newPhoto">Hình ảnh đại diện (tùy chọn)</label>
            <input
              id="newPhoto"
              type="file"
              accept="image/jpeg,image/png"
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
        </fieldset>
      )}

      <div className="form-actions">
        <Button type="submit" disabled={submitting}>
          {isNewPerson ? "Tạo và Thêm" : "Thêm"}
        </Button>
      </div>

      <ConflictWarning conflicts={conflicts} />
    </form>
  );
}
