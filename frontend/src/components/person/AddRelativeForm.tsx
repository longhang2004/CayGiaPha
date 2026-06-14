"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  addAssertedRelative,
  addDerivedRelative,
  type ConflictWarning as ConflictWarningData,
  type DerivedRelativeInput,
  type MaritalStatus,
} from "@/lib/persons";
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
}

type Mode = "derived" | "asserted";

type DerivedKind = DerivedRelativeInput["type"];

interface AddRelativeFormProps {
  treeId: string;
  /** Persons selectable as the relationship endpoints. */
  persons: PersonOption[];
  onCreated?: (relationshipId: string) => void;
}

export function AddRelativeForm({ treeId, persons, onCreated }: AddRelativeFormProps) {
  const [mode, setMode] = useState<Mode>("derived");
  const [derivedKind, setDerivedKind] = useState<DerivedKind>("bloodline_father");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>("married");
  const [sourceId, setSourceId] = useState(persons[0]?.id ?? "");
  const [targetId, setTargetId] = useState(persons[1]?.id ?? persons[0]?.id ?? "");
  const [assertedLabel, setAssertedLabel] = useState("");

  const [conflicts, setConflicts] = useState<ConflictWarningData[] | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setConflicts(undefined);
    setSubmitting(true);

    try {
      if (mode === "derived") {
        const result = await addDerivedRelative({
          treeId,
          type: derivedKind,
          sourceId,
          targetId,
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
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Không thể thêm quan hệ. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Thêm người thân">
      {formError ? (
        <p role="alert" data-testid="form-error">
          {formError}
        </p>
      ) : null}

      <fieldset>
        <legend>Kiểu quan hệ</legend>
        <label htmlFor="mode-derived">
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
        <label htmlFor="mode-asserted">
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
      </fieldset>

      <p>
        <label htmlFor="sourceId">Từ người</label>
        <br />
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
      </p>

      <p>
        <label htmlFor="targetId">Đến người</label>
        <br />
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
      </p>

      {mode === "derived" ? (
        <>
          <p>
            <label htmlFor="derivedKind">Loại quan hệ suy ra</label>
            <br />
            <select
              id="derivedKind"
              name="derivedKind"
              value={derivedKind}
              onChange={(e) => setDerivedKind(e.target.value as DerivedKind)}
            >
              <option value="bloodline_father">Cha - con</option>
              <option value="bloodline_mother">Mẹ - con</option>
              <option value="marriage">Vợ chồng</option>
            </select>
          </p>
          {derivedKind === "marriage" ? (
            <p>
              <label htmlFor="maritalStatus">Tình trạng hôn nhân</label>
              <br />
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
            </p>
          ) : null}
        </>
      ) : (
        <p>
          <label htmlFor="assertedLabel">Nhãn xưng hô (1-50 ký tự)</label>
          <br />
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
            <span id="assertedLabel-error" role="alert">
              {fieldErrors.assertedLabel}
            </span>
          ) : null}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        Thêm
      </Button>

      <ConflictWarning conflicts={conflicts} />
    </form>
  );
}
