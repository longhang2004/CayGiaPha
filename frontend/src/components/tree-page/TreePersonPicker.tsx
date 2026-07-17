"use client";

import type { RefObject } from "react";
import { useMemo, useState } from "react";
import { CGPDrawer, CGPTextField } from "@/components/cgp";
import { ChevronRightIcon } from "@/components/ui/Icons";
import type { Address, Person } from "@/lib/graph";
import { addressLabel } from "@/lib/graph";
import { normalizeName } from "@/lib/nameNormalize";

export interface TreePersonPickerProps {
  mode: "select" | "viewpoint";
  persons: Person[];
  addresses: Map<string, Address>;
  egoId: string;
  selectedId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectPerson: (personId: string) => void;
  returnFocusRef?: RefObject<HTMLElement>;
}

export function TreePersonPicker({
  mode,
  persons,
  addresses,
  egoId,
  selectedId,
  isOpen,
  onOpenChange,
  onSelectPerson,
  returnFocusRef,
}: TreePersonPickerProps) {
  const [query, setQuery] = useState("");
  const filteredPeople = useMemo(() => {
    const normalizedQuery = normalizeName(query);
    if (!normalizedQuery) return persons;
    return persons.filter((person) => {
      const relationship = person.id === egoId ? "bản thân" : addressLabel(addresses.get(person.id));
      return normalizeName(person.displayName).includes(normalizedQuery)
        || normalizeName(relationship).includes(normalizedQuery);
    });
  }, [addresses, egoId, persons, query]);

  const isViewpoint = mode === "viewpoint";
  const drawerLabel = isViewpoint ? "Chọn người để xét vai vế" : "Chọn một người";

  return (
    <CGPDrawer
      presentation="modal"
      placement="right"
      label={drawerLabel}
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) setQuery("");
      }}
      returnFocusRef={returnFocusRef}
      className="tree-person-picker"
      safeAreaEdge="right"
    >
      <div className="tree-person-picker__chrome">
        <div className="tree-person-picker__header">
          <p className="tree-person-picker__eyebrow">{isViewpoint ? "Đổi người xét" : "Tìm trong cây"}</p>
          <h2>{drawerLabel}</h2>
          <p>{isViewpoint ? "Cách xưng hô trong cây sẽ được tính lại từ người bạn chọn." : "Chọn một thành viên để xem thông tin chi tiết."}</p>
        </div>

        <CGPTextField
          type="search"
          label={isViewpoint ? "Tìm người để xét" : "Tìm thành viên"}
          value={query}
          onChange={setQuery}
          placeholder="Nhập tên hoặc cách xưng hô"
          className="tree-person-picker__search"
        />
        <p className="tree-person-picker__count" role="status" aria-live="polite">
          Tìm thấy {filteredPeople.length} người.
        </p>
      </div>

      <div className="tree-person-picker__list" data-panel-scroll-region="picker">
        {filteredPeople.map((person) => {
          const isCurrent = isViewpoint ? person.id === egoId : person.id === selectedId;
          const relationship = person.id === egoId ? "Bản thân" : addressLabel(addresses.get(person.id));
          return (
            <button
              key={person.id}
              type="button"
              className="tree-person-picker__person"
              data-selected={isCurrent ? "true" : undefined}
              aria-current={isCurrent ? "true" : undefined}
              aria-label={`${isViewpoint ? "Xét theo" : "Chọn"} ${person.displayName}`}
              onClick={() => {
                onSelectPerson(person.id);
                onOpenChange(false);
                setQuery("");
              }}
            >
              <span className={`tree-person-picker__avatar tree-person-picker__avatar--${person.gender ?? "unknown"}`} aria-hidden="true">
                {person.displayName.trim().charAt(0).toLocaleUpperCase("vi") || "?"}
              </span>
              <span className="tree-person-picker__identity">
                <strong>{person.displayName}</strong>
                <span>{relationship || "Thành viên trong cây"}</span>
              </span>
              {isCurrent ? <span className="tree-person-picker__selected">Đang chọn</span> : <span aria-hidden="true"><ChevronRightIcon size={20} /></span>}
            </button>
          );
        })}
        {filteredPeople.length === 0 ? <p className="tree-person-picker__empty">Không tìm thấy người phù hợp.</p> : null}
      </div>
    </CGPDrawer>
  );
}
