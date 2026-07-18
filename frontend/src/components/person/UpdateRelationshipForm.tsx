"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Person, Relationship } from "@/lib/graph";
import { ApiError } from "@/lib/apiClient";
import {
  addDerivedRelative,
  type ConflictWarning as ConflictWarningData,
  type RelationshipResult,
} from "@/lib/persons";
import { Button } from "@/components/Button";
import { FormControl, Select } from "@/components/ui/FormControls";
import { ConflictWarning } from "./ConflictWarning";
import {
  mapExistingPersonRelationship,
  type PrimitiveRelationshipIntent,
} from "./primitiveRelationships";

interface UpdateRelationshipFormProps {
  treeId: string;
  persons: Person[];
  relationships: Relationship[];
  anchorId: string;
  onCreated?: (relationship: RelationshipResult) => void;
  onSwitchToAddPerson?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function isPrimitiveDirectRelationship(relationship: Relationship): boolean {
  return relationship.type === "bloodline_father" ||
    relationship.type === "bloodline_mother" ||
    relationship.type === "marriage";
}

function isSamePair(relationship: Relationship, firstId: string, secondId: string): boolean {
  return (
    (relationship.sourceId === firstId && relationship.targetId === secondId) ||
    (relationship.sourceId === secondId && relationship.targetId === firstId)
  );
}

function relationshipIntentsFor(person: Person | undefined): PrimitiveRelationshipIntent[] {
  if (person?.gender === "male") return ["father", "son", "husband"];
  if (person?.gender === "female") return ["mother", "daughter", "wife"];
  return ["father", "mother", "son", "daughter", "wife", "husband"];
}

function relationshipLabel(intent: PrimitiveRelationshipIntent, anchorName: string): string {
  const names: Record<PrimitiveRelationshipIntent, string> = {
    father: "Cha",
    mother: "Mẹ",
    son: "Con trai",
    daughter: "Con gái",
    wife: "Vợ",
    husband: "Chồng",
  };
  return `${names[intent]} của ${anchorName}`;
}

export function UpdateRelationshipForm({
  treeId,
  persons,
  relationships,
  anchorId,
  onCreated,
  onSwitchToAddPerson,
  onDirtyChange,
}: UpdateRelationshipFormProps) {
  const anchor = persons.find((person) => person.id === anchorId);
  const candidates = useMemo(
    () => persons.filter((person) => person.id !== anchorId).map((person) => ({
      person,
      disabled: relationships.some(
        (relationship) =>
          isPrimitiveDirectRelationship(relationship) &&
          isSamePair(relationship, anchorId, person.id),
      ),
    })),
    [anchorId, persons, relationships],
  );
  const firstEligibleId = candidates.find((candidate) => !candidate.disabled)?.person.id ?? "";
  const [candidateId, setCandidateId] = useState(firstEligibleId);
  const candidate = persons.find((person) => person.id === candidateId);
  const availableIntents = relationshipIntentsFor(candidate);
  const [intent, setIntent] = useState<PrimitiveRelationshipIntent>(availableIntents[0] ?? "father");
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictWarningData[] | undefined>();
  const [completedResult, setCompletedResult] = useState<RelationshipResult | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!candidateId || candidates.some((item) => item.person.id === candidateId && item.disabled)) {
      setCandidateId(firstEligibleId);
    }
  }, [candidateId, candidates, firstEligibleId]);

  useEffect(() => {
    if (!availableIntents.includes(intent)) {
      setIntent(availableIntents[0] ?? "father");
    }
  }, [availableIntents, intent]);

  const defaultIntent = relationshipIntentsFor(
    persons.find((person) => person.id === firstEligibleId),
  )[0] ?? "father";
  const isDirty = candidateId !== firstEligibleId || intent !== defaultIntent;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  if (!anchor) {
    return <p role="alert">Không tìm thấy thành viên đang xem.</p>;
  }

  if (!firstEligibleId) {
    return (
      <div className="person-flow-empty" role="status">
        <p>Không còn thành viên phù hợp để nối.</p>
        <p>Bạn có thể thêm một người mới và nối họ với {anchor.displayName}.</p>
        <Button className="btn-primary btn-terracotta" onClick={onSwitchToAddPerson}>
          Thêm người mới
        </Button>
      </div>
    );
  }

  const mapping = candidate
    ? mapExistingPersonRelationship(intent, anchor, candidate)
    : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mapping) return;
    setFormError(null);
    setShowReview(true);
  }

  async function confirmSubmit() {
    if (!mapping || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    setConflicts(undefined);
    try {
      const result = await addDerivedRelative({
        treeId,
        type: mapping.type,
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
        ...(mapping.maritalStatus ? { maritalStatus: mapping.maritalStatus } : {}),
      });
      setConflicts(result.conflicts);
      setShowReview(false);
      onDirtyChange?.(false);
      if (result.conflicts?.length) {
        setCompletedResult(result);
      } else {
        onCreated?.(result);
      }
    } catch (error) {
      setFormError(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Không thể cập nhật quan hệ. Vui lòng thử lại.",
      );
      setShowReview(false);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (completedResult) {
    return (
      <div className="person-flow-complete" role="region" aria-label="Quan hệ đã được lưu">
        <h4>Quan hệ đã được lưu</h4>
        <p>Đường nối mới khác với cách xưng hô đã được ghi trước đó. Hãy xem cảnh báo bên dưới trước khi quay lại.</p>
        <ConflictWarning conflicts={conflicts} />
        <Button
          className="btn-primary btn-terracotta"
          onClick={() => onCreated?.(completedResult)}
        >
          Quay lại thông tin
        </Button>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="person-flow-review" role="region" aria-label="Kiểm tra trước khi lưu">
        <h4>Kiểm tra trước khi lưu</h4>
        <p>
          Xác nhận <strong>{candidate?.displayName}</strong> là {relationshipLabel(intent, anchor.displayName).toLocaleLowerCase("vi")}.
        </p>
        <div className="person-flow-review__actions">
          <Button className="btn-secondary" onClick={() => setShowReview(false)} disabled={submitting}>
            Quay lại chỉnh sửa
          </Button>
          <Button className="btn-primary btn-terracotta" onClick={confirmSubmit} loading={submitting}>
            Xác nhận lưu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form aria-label="Cập nhật quan hệ" onSubmit={handleSubmit}>
      <p className="person-flow-intro">
        Chọn một người đã có trong cây rồi xác nhận quan hệ với {anchor.displayName}.
      </p>
      <FormControl id="relationship-candidate" label="Thành viên cần nối" required>
        <Select id="relationship-candidate" aria-label="Thành viên cần nối" value={candidateId} onChange={(event) => setCandidateId(event.target.value)}>
          {candidates.map(({ person, disabled }) => (
            <option key={person.id} value={person.id} disabled={disabled}>
              {person.displayName}{disabled ? " (đã có quan hệ trực tiếp)" : ""}
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl id="relationship-intent" label={`Quan hệ với ${anchor.displayName}`} required>
        <Select id="relationship-intent" aria-label={`Quan hệ với ${anchor.displayName}`} value={intent} onChange={(event) => setIntent(event.target.value as PrimitiveRelationshipIntent)}>
          {availableIntents.map((option) => (
            <option key={option} value={option}>{relationshipLabel(option, anchor.displayName)}</option>
          ))}
        </Select>
      </FormControl>
      {formError ? <p role="alert" className="form-error">{formError}</p> : null}
      {conflicts?.length ? <ConflictWarning conflicts={conflicts} /> : null}
      <Button type="submit" className="btn-primary btn-terracotta" disabled={submitting}>
        Cập nhật quan hệ
      </Button>
    </form>
  );
}
