"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  searchTree,
  type SearchFilters,
  type SearchRequest,
  type SearchResult,
} from "@/lib/search";
import { Button } from "@/components/Button";

/**
 * Search & filter panel (task 10.4, Requirements 16.1–16.4, 16.6, 16.8).
 *
 * Provides a name query box and an address query box (address search is
 * relative to the current viewpoint — 16.2), plus the combinable field filters
 * (gender, side, birth-year range, death status, claimed status, relationship
 * type — 16.3). All set filters are sent together and intersected by the
 * backend (16.4). Results are rendered as a list; when nothing matches, an
 * explicit no-match indication is shown (16.6). Field-level errors from the
 * error envelope are surfaced inline and associated via `aria-describedby`
 * (16.8).
 */

interface SearchPanelProps {
  treeId: string;
  /** Current viewpoint (ego) used for address search and side filtering. */
  viewpointId?: string;
  /** Notifies the parent when a result is chosen (e.g. to focus the node). */
  onSelectResult?: (personId: string) => void;
}

function parseOptionalInt(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
}

export function SearchPanel({ treeId, viewpointId, onSelectResult }: SearchPanelProps) {
  const [nameQuery, setNameQuery] = useState("");
  const [addressQuery, setAddressQuery] = useState("");

  const [gender, setGender] = useState("");
  const [side, setSide] = useState("");
  const [birthYearMin, setBirthYearMin] = useState("");
  const [birthYearMax, setBirthYearMax] = useState("");
  const [deathStatus, setDeathStatus] = useState("");
  const [claimedStatus, setClaimedStatus] = useState("");
  const [relationshipType, setRelationshipType] = useState("");

  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [noMatches, setNoMatches] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function describedBy(field: string): string | undefined {
    return fieldErrors[field] ? `${field}-error` : undefined;
  }

  function buildFilters(): SearchFilters {
    const filters: SearchFilters = {};
    if (gender === "male" || gender === "female") filters.gender = gender;
    if (side === "paternal" || side === "maternal") filters.side = side;
    const min = parseOptionalInt(birthYearMin);
    const max = parseOptionalInt(birthYearMax);
    if (min !== undefined) filters.birthYearMin = min;
    if (max !== undefined) filters.birthYearMax = max;
    if (deathStatus === "true") filters.deathStatus = true;
    if (deathStatus === "false") filters.deathStatus = false;
    if (claimedStatus === "claimed" || claimedStatus === "unclaimed") {
      filters.claimedStatus = claimedStatus;
    }
    if (
      relationshipType === "bloodline" ||
      relationshipType === "marriage" ||
      relationshipType === "asserted" ||
      relationshipType === "non_bloodline"
    ) {
      filters.relationshipType = relationshipType;
    }
    return filters;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    const request: SearchRequest = {
      nameQuery,
      addressQuery,
      viewpointId,
      filters: buildFilters(),
    };

    try {
      const response = await searchTree(treeId, request);
      setResults(response.results);
      setNoMatches(response.noMatches || response.results.length === 0);
    } catch (error) {
      setResults(null);
      setNoMatches(false);
      if (error instanceof ApiError && error.field) {
        setFieldErrors({ [error.field]: error.message });
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Không thể tìm kiếm. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-label="Tìm kiếm và lọc">
      <form onSubmit={handleSubmit} aria-label="Tìm kiếm">
        {formError ? (
          <p role="alert" data-testid="search-error">
            {formError}
          </p>
        ) : null}

        <p>
          <label htmlFor="nameQuery">Tên</label>
          <br />
          <input
            id="nameQuery"
            name="nameQuery"
            type="search"
            value={nameQuery}
            aria-invalid={fieldErrors.nameQuery ? true : undefined}
            aria-describedby={describedBy("nameQuery")}
            onChange={(e) => setNameQuery(e.target.value)}
          />
          {fieldErrors.nameQuery ? (
            <span id="nameQuery-error" role="alert">
              {fieldErrors.nameQuery}
            </span>
          ) : null}
        </p>

        <p>
          <label htmlFor="addressQuery">Cách xưng hô</label>
          <br />
          <input
            id="addressQuery"
            name="addressQuery"
            type="search"
            value={addressQuery}
            aria-invalid={fieldErrors.addressQuery ? true : undefined}
            aria-describedby={describedBy("addressQuery")}
            onChange={(e) => setAddressQuery(e.target.value)}
          />
          {fieldErrors.addressQuery ? (
            <span id="addressQuery-error" role="alert">
              {fieldErrors.addressQuery}
            </span>
          ) : null}
        </p>

        <fieldset>
          <legend>Bộ lọc</legend>

          <label htmlFor="filter-gender">Giới tính</label>
          <select
            id="filter-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
          </select>

          <label htmlFor="filter-side">Bên</label>
          <select id="filter-side" value={side} onChange={(e) => setSide(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="paternal">Nội</option>
            <option value="maternal">Ngoại</option>
          </select>

          <label htmlFor="filter-birthYearMin">Năm sinh từ</label>
          <input
            id="filter-birthYearMin"
            type="number"
            value={birthYearMin}
            aria-invalid={fieldErrors.birthYearMin ? true : undefined}
            aria-describedby={describedBy("birthYearMin")}
            onChange={(e) => setBirthYearMin(e.target.value)}
          />
          {fieldErrors.birthYearMin ? (
            <span id="birthYearMin-error" role="alert">
              {fieldErrors.birthYearMin}
            </span>
          ) : null}

          <label htmlFor="filter-birthYearMax">đến</label>
          <input
            id="filter-birthYearMax"
            type="number"
            value={birthYearMax}
            aria-invalid={fieldErrors.birthYearMax ? true : undefined}
            aria-describedby={describedBy("birthYearMax")}
            onChange={(e) => setBirthYearMax(e.target.value)}
          />
          {fieldErrors.birthYearMax ? (
            <span id="birthYearMax-error" role="alert">
              {fieldErrors.birthYearMax}
            </span>
          ) : null}

          <label htmlFor="filter-deathStatus">Tình trạng mất</label>
          <select
            id="filter-deathStatus"
            value={deathStatus}
            onChange={(e) => setDeathStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="true">Đã mất</option>
            <option value="false">Còn sống</option>
          </select>

          <label htmlFor="filter-claimedStatus">Trạng thái xác nhận</label>
          <select
            id="filter-claimedStatus"
            value={claimedStatus}
            onChange={(e) => setClaimedStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="claimed">Đã xác nhận</option>
            <option value="unclaimed">Chưa xác nhận</option>
          </select>

          <label htmlFor="filter-relationshipType">Loại quan hệ</label>
          <select
            id="filter-relationshipType"
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="bloodline">Huyết thống</option>
            <option value="marriage">Hôn nhân</option>
            <option value="asserted">Khai báo</option>
            <option value="non_bloodline">Ngoài huyết thống</option>
          </select>
        </fieldset>

        <Button type="submit" disabled={submitting}>
          Tìm
        </Button>
      </form>

      {noMatches ? (
        <p role="status" data-testid="no-matches">
          Không tìm thấy kết quả.
        </p>
      ) : null}

      {results && results.length > 0 ? (
        <ul aria-label="Kết quả tìm kiếm">
          {results.map((r) => (
            <li key={r.personId}>
              <button type="button" onClick={() => onSelectResult?.(r.personId)}>
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
