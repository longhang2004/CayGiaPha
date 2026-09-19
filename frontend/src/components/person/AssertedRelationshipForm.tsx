"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Person, Relationship } from "@/lib/graph";
import { ApiError } from "@/lib/apiClient";
import { addAssertedRelative, type RelationshipResult } from "@/lib/persons";
import { Button } from "@/components/Button";
import { FormControl, Input, Select } from "@/components/ui/FormControls";

interface AssertedRelationshipFormProps {
  treeId: string;
  persons: Person[];
  relationships: Relationship[];
  anchorId: string;
  onCreated?: (relationship: RelationshipResult) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function isSameDirectedPair(relationship: Relationship, sourceId: string, targetId: string): boolean {
  return relationship.sourceId === sourceId && relationship.targetId === targetId;
}

export function AssertedRelationshipForm({
  treeId,
  persons,
  relationships,
  anchorId,
  onCreated,
  onDirtyChange,
}: AssertedRelationshipFormProps) {
  const anchor = persons.find((person) => person.id === anchorId);
  const candidates = useMemo(
    () =>
      persons
        .filter((person) => person.id !== anchorId)
        .map((person) => ({
          person,
          disabled: relationships.some(
            (relationship) =>
              relationship.type === "asserted" &&
              isSameDirectedPair(relationship, anchorId, person.id),
          ),
        })),
    [anchorId, persons, relationships],
  );
  const firstEligibleId = candidates.find((candidate) => !candidate.disabled)?.person.id ?? "";
  const [candidateId, setCandidateId] = useState(firstEligibleId);
  const [label, setLabel] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!candidateId || candidates.some((item) => item.person.id === candidateId && item.disabled)) {
      setCandidateId(firstEligibleId);
    }
  }, [candidateId, candidates, firstEligibleId]);

  const candidate = persons.find((person) => person.id === candidateId);
  const trimmedLabel = label.trim();
  const isDirty = candidateId !== firstEligibleId || trimmedLabel.length > 0;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  if (!anchor) {
    return <p role="alert">Không tìm thấy thành viên đang xem.</p>;
  }

  if (!firstEligibleId) {
    return (
      <div className="person-flow-empty" role="status">
        <p>Không còn thành viên phù hợp để ghi cách gọi.</p>
        <p>Thêm người mới trước, rồi quay lại ghi cách {anchor.displayName} gọi họ.</p>
      </div>
    );
  }

  function validateLabel(): string | null {
    if (trimmedLabel.length < 1) {
      return "Nhập cách gọi, ví dụ bác, chú, cô.";
    }
    if (trimmedLabel.length > 50) {
      return "Cách gọi tối đa 50 chữ.";
    }
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateLabel();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setShowReview(true);
  }

  async function confirmSubmit() {
    if (!candidate || submittingRef.current) return;
    const error = validateLabel();
    if (error) {
      setFormError(error);
      setShowReview(false);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await addAssertedRelative({
        treeId,
        sourceId: anchorId,
        targetId: candidate.id,
        assertedLabel: trimmedLabel,
      });
      onDirtyChange?.(false);
      onCreated?.(result);
    } catch (caught) {
      setFormError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "Không thể ghi cách gọi. Vui lòng thử lại.",
      );
      setShowReview(false);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (showReview) {
    return (
      <div className="person-flow-review" role="region" aria-label="Kiểm tra trước khi lưu">
        <h4>Kiểm tra trước khi lưu</h4>
        <p>
          {anchor.displayName} gọi {candidate?.displayName} là {trimmedLabel}. Đường này sẽ hiện nét
          đứt cho đến khi có đủ người trung gian.
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
    <form aria-label="Ghi cách gọi khi chưa rõ đường nối" onSubmit={handleSubmit}>
      <p className="person-flow-intro">
        Khi chưa biết ông bà trung gian, hãy ghi cách {anchor.displayName} gọi người kia. Ví dụ bác,
        chú, cô, dì. Đường này nét đứt; hệ thống chưa tính xưng hô khác qua đường đó.
      </p>
      <FormControl id="asserted-candidate" label="Người được gọi" required>
        <Select
          id="asserted-candidate"
          aria-label="Người được gọi"
          value={candidateId}
          onChange={(event) => setCandidateId(event.target.value)}
        >
          {candidates.map(({ person, disabled }) => (
            <option key={person.id} value={person.id} disabled={disabled}>
              {person.displayName}
              {disabled ? " (đã có cách gọi nét đứt)" : ""}
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl id="asserted-label" label="Cách gọi" required>
        <Input
          id="asserted-label"
          aria-label="Cách gọi"
          value={label}
          maxLength={80}
          autoComplete="off"
          placeholder="Ví dụ: bác"
          onChange={(event) => setLabel(event.target.value)}
        />
      </FormControl>
      {formError ? <p role="alert" className="form-error">{formError}</p> : null}
      <Button type="submit" className="btn-primary btn-terracotta">
        Ghi cách gọi
      </Button>
    </form>
  );
}
