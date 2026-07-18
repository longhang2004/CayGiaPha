"use client";

import { useId, useState } from "react";
import { FilterIcon, SearchIcon } from "@/components/ui/Icons";
import type { WorkspacePeopleFilters } from "@/lib/tree-workspace/people";

export interface TreePeopleSearchChromeProps {
  query: string;
  filters: WorkspacePeopleFilters;
  resultCount: number;
  onQueryChange: (value: string) => void;
  onFiltersChange: (filters: WorkspacePeopleFilters) => void;
  onClear: () => void;
}

function optionalYear(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const year = Number(value);
  return Number.isInteger(year) ? year : undefined;
}

export function activeWorkspacePeopleFilterCount(filters: WorkspacePeopleFilters): number {
  return [
    filters.gender !== "all",
    filters.side !== "all",
    filters.birthYearFrom !== undefined,
    filters.birthYearTo !== undefined,
    filters.lifeStatus !== "all",
    filters.claimedStatus !== "all",
    filters.relationshipType !== "all",
  ].filter(Boolean).length;
}

export function TreePeopleSearchChrome({
  query,
  filters,
  resultCount,
  onQueryChange,
  onFiltersChange,
  onClear,
}: TreePeopleSearchChromeProps) {
  const id = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = activeWorkspacePeopleFilterCount(filters);
  const hasActiveSearch = Boolean(query.trim() || filterCount > 0);

  const updateFilter = <Key extends keyof WorkspacePeopleFilters>(
    key: Key,
    value: WorkspacePeopleFilters[Key],
  ) => onFiltersChange({ ...filters, [key]: value });

  return (
    <div className="tree-people-list__search-chrome" data-guidance-anchor="workspace-search">
      <div className="tree-people-list__search-row" role="search">
        <SearchIcon size={19} />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label="Tìm theo tên hoặc cách xưng hô"
          placeholder="Tìm tên hoặc cách xưng hô"
        />
        <button
          type="button"
          className="tree-people-list__tool-button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls={`${id}-filters`}
          aria-label={
            filterCount > 0
              ? `Bộ lọc đang dùng: ${filterCount}`
              : "Mở bộ lọc thành viên"
          }
        >
          <FilterIcon size={19} />
          {filterCount > 0 ? <span>{filterCount}</span> : null}
        </button>
      </div>

      {filtersOpen ? (
        <div
          id={`${id}-filters`}
          className="tree-people-list__filters"
          role="group"
          aria-label="Bộ lọc thành viên"
        >
          <label>
            Giới tính
            <select
              value={filters.gender}
              onChange={(event) =>
                updateFilter("gender", event.target.value as WorkspacePeopleFilters["gender"])
              }
            >
              <option value="all">Tất cả</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </label>
          <label>
            Nhánh gia đình
            <select
              value={filters.side}
              onChange={(event) =>
                updateFilter("side", event.target.value as WorkspacePeopleFilters["side"])
              }
            >
              <option value="all">Tất cả</option>
              <option value="paternal">Bên nội</option>
              <option value="maternal">Bên ngoại</option>
              <option value="none">Chưa xác định</option>
            </select>
          </label>
          <div className="tree-people-list__year-range">
            <label>
              Năm sinh từ
              <input
                type="number"
                inputMode="numeric"
                value={filters.birthYearFrom ?? ""}
                onChange={(event) => updateFilter("birthYearFrom", optionalYear(event.target.value))}
              />
            </label>
            <label>
              Đến
              <input
                type="number"
                inputMode="numeric"
                value={filters.birthYearTo ?? ""}
                onChange={(event) => updateFilter("birthYearTo", optionalYear(event.target.value))}
              />
            </label>
          </div>
          <label>
            Tình trạng
            <select
              value={filters.lifeStatus}
              onChange={(event) =>
                updateFilter(
                  "lifeStatus",
                  event.target.value as WorkspacePeopleFilters["lifeStatus"],
                )
              }
            >
              <option value="all">Tất cả</option>
              <option value="living">Còn sống</option>
              <option value="deceased">Đã mất</option>
            </select>
          </label>
          <label>
            Liên kết tài khoản
            <select
              value={filters.claimedStatus}
              onChange={(event) =>
                updateFilter(
                  "claimedStatus",
                  event.target.value as WorkspacePeopleFilters["claimedStatus"],
                )
              }
            >
              <option value="all">Tất cả</option>
              <option value="claimed">Đã liên kết</option>
              <option value="unclaimed">Chưa liên kết</option>
            </select>
          </label>
          <label>
            Loại quan hệ
            <select
              value={filters.relationshipType}
              onChange={(event) =>
                updateFilter(
                  "relationshipType",
                  event.target.value as WorkspacePeopleFilters["relationshipType"],
                )
              }
            >
              <option value="all">Tất cả</option>
              <option value="bloodline">Cha mẹ và con</option>
              <option value="marriage">Vợ chồng</option>
              <option value="asserted">Đường nét đứt</option>
              <option value="social">Quan hệ xã hội</option>
            </select>
          </label>
        </div>
      ) : null}

      {hasActiveSearch ? (
        <div className="tree-people-list__search-summary" aria-live="polite">
          <span>{resultCount} kết quả</span>
          <button type="button" onClick={onClear} aria-label="Xóa tìm kiếm và bộ lọc">
            Xóa điều kiện
          </button>
        </div>
      ) : null}
    </div>
  );
}
