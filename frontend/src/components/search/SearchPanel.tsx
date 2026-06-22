"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  searchTree,
  type SearchFilters,
  type SearchRequest,
  type SearchResult,
} from "@/lib/search";
import { Button } from "@/components/Button";

/**
 * Redesigned Search & Filter Toolbar (Requirement 16.x).
 *
 * Renders horizontally at the top, includes a popover Filter Modal,
 * and displays results in a floating absolute dropdown.
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hasActiveFilters = () => {
    return (
      gender !== "" ||
      side !== "" ||
      birthYearMin !== "" ||
      birthYearMax !== "" ||
      deathStatus !== "" ||
      claimedStatus !== "" ||
      relationshipType !== ""
    );
  };

  const handleResetFilters = () => {
    setGender("");
    setSide("");
    setBirthYearMin("");
    setBirthYearMax("");
    setDeathStatus("");
    setClaimedStatus("");
    setRelationshipType("");
  };

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
      setShowDropdown(true);
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
      setShowDropdown(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="search-panel-toolbar" ref={toolbarRef}>
      <section aria-label="Tìm kiếm và lọc">
        <form onSubmit={handleSubmit} aria-label="Tìm kiếm">
          {formError ? (
            <p role="alert" data-testid="search-error" className="form-error">
              {formError}
            </p>
          ) : null}

          <div className="search-panel-toolbar__fields">
            <div className="field search-field">
              <label htmlFor="nameQuery" className="sr-only">Tên</label>
              <input
                id="nameQuery"
                name="nameQuery"
                type="search"
                placeholder="Tìm theo tên..."
                value={nameQuery}
                aria-invalid={fieldErrors.nameQuery ? true : undefined}
                aria-describedby={describedBy("nameQuery")}
                onChange={(e) => {
                  setNameQuery(e.target.value);
                  if (e.target.value) setShowDropdown(true);
                }}
              />
              {fieldErrors.nameQuery ? (
                <span id="nameQuery-error" role="alert" className="field-error">
                  {fieldErrors.nameQuery}
                </span>
              ) : null}
            </div>

            <div className="field search-field">
              <label htmlFor="addressQuery" className="sr-only">Cách xưng hô</label>
              <input
                id="addressQuery"
                name="addressQuery"
                type="search"
                placeholder="Tìm theo cách xưng hô..."
                value={addressQuery}
                aria-invalid={fieldErrors.addressQuery ? true : undefined}
                aria-describedby={describedBy("addressQuery")}
                onChange={(e) => {
                  setAddressQuery(e.target.value);
                  if (e.target.value) setShowDropdown(true);
                }}
              />
              {fieldErrors.addressQuery ? (
                <span id="addressQuery-error" role="alert" className="field-error">
                  {fieldErrors.addressQuery}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              className={`btn btn-secondary filter-toggle-btn ${hasActiveFilters() ? "filter-toggle-btn--active" : ""}`}
              onClick={() => setIsModalOpen(true)}
              aria-expanded={isModalOpen}
            >
              Lọc {hasActiveFilters() ? "•" : ""}
            </button>

            <button type="submit" className="btn search-submit-btn" disabled={submitting}>
              Tìm
            </button>
          </div>
        </form>

        {/* Filter Modal */}
        {isModalOpen && (
          <div className="filter-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="filter-modal-title">
            <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
              <div className="filter-modal__header">
                <h3 id="filter-modal-title">Bộ lọc nâng cao</h3>
                <button
                  type="button"
                  className="filter-modal__close-btn"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Đóng bộ lọc"
                >
                  &times;
                </button>
              </div>

              <div className="filter-modal__body">
                <fieldset>
                  <legend className="sr-only">Bộ lọc tìm kiếm</legend>

                  <div className="field">
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
                  </div>

                  <div className="field">
                    <label htmlFor="filter-side">Bên</label>
                    <select id="filter-side" value={side} onChange={(e) => setSide(e.target.value)}>
                      <option value="">Tất cả</option>
                      <option value="paternal">Nội</option>
                      <option value="maternal">Ngoại</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Khoảng năm sinh</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        id="filter-birthYearMin"
                        type="number"
                        placeholder="Từ"
                        aria-label="Năm sinh từ"
                        value={birthYearMin}
                        aria-invalid={fieldErrors.birthYearMin ? true : undefined}
                        aria-describedby={describedBy("birthYearMin")}
                        onChange={(e) => setBirthYearMin(e.target.value)}
                        style={{ flex: 1, marginTop: 0 }}
                      />
                      <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>đến</span>
                      <input
                        id="filter-birthYearMax"
                        type="number"
                        placeholder="Đến"
                        aria-label="đến"
                        value={birthYearMax}
                        aria-invalid={fieldErrors.birthYearMax ? true : undefined}
                        aria-describedby={describedBy("birthYearMax")}
                        onChange={(e) => setBirthYearMax(e.target.value)}
                        style={{ flex: 1, marginTop: 0 }}
                      />
                    </div>
                    {fieldErrors.birthYearMin ? (
                      <span id="birthYearMin-error" role="alert" className="field-error">
                        {fieldErrors.birthYearMin}
                      </span>
                    ) : null}
                    {fieldErrors.birthYearMax ? (
                      <span id="birthYearMax-error" role="alert" className="field-error">
                        {fieldErrors.birthYearMax}
                      </span>
                    ) : null}
                  </div>

                  <div className="field">
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
                  </div>

                  <div className="field">
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
                  </div>

                  <div className="field">
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
                  </div>
                </fieldset>
              </div>

              <div className="filter-modal__footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResetFilters}
                >
                  Xóa bộ lọc
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Results Dropdown */}
        {showDropdown && (
          <div className="search-results-dropdown">
            {noMatches ? (
              <p role="status" data-testid="no-matches" className="text-muted" style={{ padding: "0.75rem 1rem", margin: 0 }}>
                Không tìm thấy kết quả.
              </p>
            ) : null}

            {results && results.length > 0 ? (
              <ul aria-label="Kết quả tìm kiếm" className="search-results-dropdown__list">
                {results.map((r) => (
                  <li key={r.personId}>
                    <button
                      type="button"
                      className="search-results-dropdown__item"
                      onClick={() => {
                        onSelectResult?.(r.personId);
                        setShowDropdown(false);
                      }}
                    >
                      {r.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
