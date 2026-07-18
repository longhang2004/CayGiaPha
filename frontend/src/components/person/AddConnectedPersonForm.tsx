"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Person } from "@/lib/graph";
import { ApiError } from "@/lib/apiClient";
import {
  createRelativeWithPerson,
  type CreatedRelative,
} from "@/lib/persons";
import { uploadPhoto } from "@/lib/photos";
import { trackUxEvent, getUxViewportClass } from "@/lib/analytics/uxEvents";
import { Button } from "@/components/Button";
import { PhotoFilePicker } from "@/components/photos/PhotoFilePicker";
import { FormControl, Input, Select } from "@/components/ui/FormControls";
import { LawfulBasisNotice } from "./LawfulBasisNotice";
import {
  mapNewPersonRelationship,
  type PrimitiveRelationshipIntent,
} from "./primitiveRelationships";

interface AddConnectedPersonFormProps {
  treeId: string;
  persons: Person[];
  preferredAnchorId?: string | null;
  egoId?: string | null;
  onCreated?: (personId: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const RELATIONSHIP_LABELS: Record<PrimitiveRelationshipIntent, string> = {
  father: "Cha của người làm mốc",
  mother: "Mẹ của người làm mốc",
  son: "Con trai của người làm mốc",
  daughter: "Con gái của người làm mốc",
  wife: "Vợ của người làm mốc",
  husband: "Chồng của người làm mốc",
};

const RELATIONSHIP_INTENTS = Object.keys(
  RELATIONSHIP_LABELS,
) as PrimitiveRelationshipIntent[];

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function AddConnectedPersonForm({
  treeId,
  persons,
  preferredAnchorId,
  egoId,
  onCreated,
  onDirtyChange,
}: AddConnectedPersonFormProps) {
  const editableAnchors = useMemo(
    () => persons.filter((person) => person.capabilities?.editRelationships === true),
    [persons],
  );
  const defaultAnchorId =
    editableAnchors.find((person) => person.id === preferredAnchorId)?.id ??
    editableAnchors.find((person) => person.id === egoId)?.id ??
    editableAnchors[0]?.id ??
    "";

  const [anchorId, setAnchorId] = useState(defaultAnchorId);
  const [relationshipIntent, setRelationshipIntent] =
    useState<PrimitiveRelationshipIntent>("father");
  const [displayName, setDisplayName] = useState("");
  const [birthOrder, setBirthOrder] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [deceased, setDeceased] = useState(false);
  const [deathDay, setDeathDay] = useState("");
  const [deathMonth, setDeathMonth] = useState("");
  const [deathYear, setDeathYear] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [partialSuccess, setPartialSuccess] = useState<{
    personId: string;
    displayName: string;
  } | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!editableAnchors.some((person) => person.id === anchorId)) {
      setAnchorId(defaultAnchorId);
    }
  }, [anchorId, defaultAnchorId, editableAnchors]);

  const isDirty = Boolean(
    anchorId !== defaultAnchorId ||
      relationshipIntent !== "father" ||
      displayName ||
      birthOrder ||
      birthYear ||
      phone ||
      email ||
      deceased ||
      deathDay ||
      deathMonth ||
      deathYear ||
      photo,
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  if (editableAnchors.length === 0) {
    return (
      <div className="person-flow-empty" role="status">
        <p>Bạn chưa có quyền nối người mới với thành viên nào trong cây.</p>
      </div>
    );
  }

  const anchor = editableAnchors.find((person) => person.id === anchorId) ?? editableAnchors[0];
  const mapping = mapNewPersonRelationship(relationshipIntent, anchor);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim()) {
      setFieldErrors({ displayName: "Vui lòng nhập họ và tên." });
      return;
    }
    setFieldErrors({});
    setShowReview(true);
  }

  async function confirmSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    trackUxEvent("ux_core_flow_start", {
      flow: "add_relative",
      surface: "relative_form",
      viewportClass: getUxViewportClass(),
      accessRole: "unknown",
      outcome: "started",
    });

    try {
      const order = optionalNumber(birthOrder);
      const year = optionalNumber(birthYear);
      const dDay = optionalNumber(deathDay);
      const dMonth = optionalNumber(deathMonth);
      const dYear = optionalNumber(deathYear);
      const created: CreatedRelative = await createRelativeWithPerson({
        treeId,
        person: {
          displayName: displayName.trim(),
          gender: mapping.gender,
          deathStatus: deceased,
          ...(order !== undefined ? { birthOrder: order } : {}),
          ...(year !== undefined ? { birthYear: year } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(deceased && dDay !== undefined && dMonth !== undefined
            ? {
                deathDay: dDay,
                deathMonth: dMonth,
                ...(dYear !== undefined ? { deathYear: dYear } : {}),
                deathCalendar: "lunar",
                deathLunarLeap: false,
              }
            : {}),
        },
        relationship: {
          type: mapping.type,
          existingPersonId: mapping.existingPersonId,
          newPersonPosition: mapping.newPersonPosition,
          ...(mapping.maritalStatus
            ? { maritalStatus: mapping.maritalStatus }
            : {}),
        },
      });

      let photoUploadFailed = false;
      if (photo) {
        try {
          await uploadPhoto(treeId, created.personId, photo);
        } catch {
          photoUploadFailed = true;
          setPartialSuccess({
            personId: created.personId,
            displayName: displayName.trim(),
          });
        }
      }

      setShowReview(false);
      trackUxEvent("ux_core_flow_complete", {
        flow: "add_relative",
        surface: "relative_form",
        viewportClass: getUxViewportClass(),
        accessRole: "unknown",
        outcome: "completed",
      });
      onDirtyChange?.(false);
      if (!photoUploadFailed) {
        onCreated?.(created.personId);
      }
    } catch (error) {
      if (error instanceof ApiError && error.field) {
        setFieldErrors({ [error.field]: error.message });
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "Không thể thêm người mới. Vui lòng thử lại.",
        );
      }
      setShowReview(false);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (partialSuccess) {
    return (
      <div className="person-flow-partial-success" role="status">
        <h4>Đã lưu thông tin của {partialSuccess.displayName}</h4>
        <p>Ảnh chưa tải lên được. Mở hồ sơ để thử lại.</p>
        <Button
          type="button"
          className="btn-primary btn-terracotta"
          onClick={() => onCreated?.(partialSuccess.personId)}
        >
          Mở thông tin thành viên
        </Button>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="person-flow-review" role="region" aria-label="Kiểm tra trước khi lưu">
        <h4>Kiểm tra trước khi lưu</h4>
        <p>
          Thêm <strong>{displayName.trim()}</strong> là {RELATIONSHIP_LABELS[relationshipIntent].toLocaleLowerCase("vi")} của <strong>{anchor.displayName}</strong>.
        </p>
        {formError ? <p role="alert">{formError}</p> : null}
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
    <form aria-label="Thêm người mới" onSubmit={handleSubmit}>
      <LawfulBasisNotice />
      <FormControl id="new-person-anchor" label="Người mới có quan hệ với" required>
        <Select id="new-person-anchor" aria-label="Người mới có quan hệ với" value={anchorId} onChange={(event) => setAnchorId(event.target.value)}>
          {editableAnchors.map((person) => (
            <option key={person.id} value={person.id}>{person.displayName}</option>
          ))}
        </Select>
      </FormControl>
      <FormControl id="new-person-relationship" label="Quan hệ với người làm mốc" required>
        <Select
          id="new-person-relationship"
          aria-label="Quan hệ với người làm mốc"
          value={relationshipIntent}
          onChange={(event) => setRelationshipIntent(event.target.value as PrimitiveRelationshipIntent)}
        >
          {RELATIONSHIP_INTENTS.map((intent) => (
            <option key={intent} value={intent}>{RELATIONSHIP_LABELS[intent]}</option>
          ))}
        </Select>
      </FormControl>
      <FormControl id="new-person-name" label="Họ và tên" required error={fieldErrors.displayName}>
        <Input
          id="new-person-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          error={fieldErrors.displayName}
          autoComplete="name"
        />
      </FormControl>

      <details className="person-flow-details">
        <summary>Thêm thông tin khác</summary>
        <div className="person-flow-details__body">
          <FormControl id="new-person-birth-order" label="Thứ tự sinh trong anh chị em ruột (tùy chọn)">
            <Input id="new-person-birth-order" type="number" min="1" value={birthOrder} onChange={(event) => setBirthOrder(event.target.value)} />
          </FormControl>
          <FormControl id="new-person-birth-year" label="Năm sinh (tùy chọn)">
            <Input id="new-person-birth-year" type="number" inputMode="numeric" value={birthYear} onChange={(event) => setBirthYear(event.target.value)} />
          </FormControl>
          <FormControl id="new-person-phone" label="Số điện thoại (tùy chọn)">
            <Input id="new-person-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </FormControl>
          <FormControl id="new-person-email" label="Email (tùy chọn)">
            <Input id="new-person-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </FormControl>
          <label className="person-flow-checkbox">
            <input type="checkbox" checked={deceased} onChange={(event) => setDeceased(event.target.checked)} />
            Người này đã mất
          </label>
          {deceased ? (
            <div className="person-flow-date-grid">
              <FormControl id="new-person-death-day" label="Ngày mất"><Input id="new-person-death-day" type="number" min="1" max="31" value={deathDay} onChange={(event) => setDeathDay(event.target.value)} /></FormControl>
              <FormControl id="new-person-death-month" label="Tháng mất"><Input id="new-person-death-month" type="number" min="1" max="12" value={deathMonth} onChange={(event) => setDeathMonth(event.target.value)} /></FormControl>
              <FormControl id="new-person-death-year" label="Năm mất (tùy chọn)"><Input id="new-person-death-year" type="number" value={deathYear} onChange={(event) => setDeathYear(event.target.value)} /></FormControl>
            </div>
          ) : null}
          <PhotoFilePicker
            id="new-person-photo"
            value={photo}
            onChange={setPhoto}
            label="Ảnh đại diện (tùy chọn)"
            hint="JPEG hoặc PNG, tối đa 5 MiB."
            disabled={submitting}
          />
        </div>
      </details>

      {formError ? <p role="alert" className="form-error">{formError}</p> : null}
      <Button type="submit" className="btn-primary btn-terracotta" disabled={submitting}>
        Thêm người mới
      </Button>
    </form>
  );
}
