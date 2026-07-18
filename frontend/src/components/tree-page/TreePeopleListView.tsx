"use client";

import { useId, useMemo, useState } from "react";
import { ChevronRightIcon } from "@/components/ui/Icons";
import { trackUxEvent, getUxAccessRole, getUxViewportClass } from "@/lib/analytics/uxEvents";
import { addressLabel, type Address, type Person, type Relationship, type TreeAccessRole } from "@/lib/graph";
import {
  DEFAULT_WORKSPACE_PEOPLE_FILTERS,
  filterWorkspacePeopleWithFilters,
  getFocusRelations,
  type WorkspacePeopleFilters,
} from "@/lib/tree-workspace/people";
import {
  activeWorkspacePeopleFilterCount,
  TreePeopleSearchChrome,
} from "./TreePeopleSearchChrome";

export interface TreePeopleListViewProps {
  persons: Person[];
  relationships: Relationship[];
  addresses: Map<string, Address>;
  egoId: string;
  selectedId: string | null;
  onSelectPerson: (id: string, opener?: HTMLElement | null) => void;
  accessRole: TreeAccessRole;
}

export function TreePeopleListView({
  persons,
  relationships,
  addresses,
  egoId,
  selectedId,
  onSelectPerson,
  accessRole,
}: TreePeopleListViewProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<WorkspacePeopleFilters>(
    DEFAULT_WORKSPACE_PEOPLE_FILTERS,
  );
  const filterCount = activeWorkspacePeopleFilterCount(filters);
  const hasActiveSearch = Boolean(query.trim() || filterCount > 0);
  const filteredPeople = useMemo(
    () =>
      filterWorkspacePeopleWithFilters({ persons, relationships, addresses, query, filters }),
    [addresses, filters, persons, query, relationships],
  );
  const closeRelations = getFocusRelations(egoId, persons, relationships, addresses).filter(
    (relation) => ["father", "mother", "spouse", "child"].includes(relation.kind),
  );
  const closeIds = new Set(closeRelations.map((relation) => relation.person.id));
  const others = persons.filter((person) => !closeIds.has(person.id));
  const guidancePersonId = hasActiveSearch
    ? filteredPeople[0]?.id
    : closeRelations[0]?.person.id ?? others[0]?.id;

  const handleSelect = (person: Person, opener: HTMLButtonElement) => {
    trackUxEvent("ux_core_flow_complete", {
      flow: "find_person",
      surface: "workspace_list",
      viewportClass: getUxViewportClass(),
      accessRole: getUxAccessRole(accessRole),
      outcome: "completed",
    });
    onSelectPerson(person.id, opener);
  };

  const clearSearch = () => {
    setQuery("");
    setFilters(DEFAULT_WORKSPACE_PEOPLE_FILTERS);
  };

  const renderPersonRow = (person: Person, relationshipLabel?: string) => {
    const address = addresses.get(person.id);
    const isSelected = selectedId === person.id;
    return (
      <button
        key={person.id}
        type="button"
        className="tree-people-list__row focus-visible-ring"
        data-guidance-anchor={person.id === guidancePersonId ? "workspace-person-list" : undefined}
        data-selected={isSelected ? "true" : undefined}
        aria-pressed={isSelected}
        aria-label={`Chọn ${person.displayName}`}
        onClick={(event) => handleSelect(person, event.currentTarget)}
      >
        <span
          className={`tree-people-list__avatar tree-people-list__avatar--${person.gender ?? "unknown"}`}
          aria-hidden="true"
        >
          {person.displayName.trim().charAt(0).toLocaleUpperCase("vi") || "?"}
        </span>
        <span className="tree-people-list__identity">
          <strong>{person.displayName}</strong>
          <span>
            {relationshipLabel ?? (address ? addressLabel(address) : "Thành viên trong cây")}
          </span>
        </span>
        <span className="tree-people-list__chevron" aria-hidden="true">
          <ChevronRightIcon size={20} />
        </span>
      </button>
    );
  };

  return (
    <div className="tree-people-list">
      <TreePeopleSearchChrome
        query={query}
        filters={filters}
        resultCount={filteredPeople.length}
        onQueryChange={setQuery}
        onFiltersChange={setFilters}
        onClear={clearSearch}
      />

      <div className="tree-people-list__scroll" data-panel-scroll-region="people-list">
        {hasActiveSearch ? (
          <section
            className="tree-people-list__group"
            role="region"
            aria-labelledby={`${id}-results-heading`}
          >
            <div className="tree-people-list__section-heading">
              <h2 id={`${id}-results-heading`}>Kết quả</h2>
              <span>{filteredPeople.length}</span>
            </div>
            {filteredPeople.length > 0 ? (
              filteredPeople.map((person) => renderPersonRow(person))
            ) : (
              <p className="tree-people-list__empty">Không tìm thấy thành viên phù hợp.</p>
            )}
          </section>
        ) : (
          <>
            <section
              className="tree-people-list__group"
              role="region"
              aria-labelledby={`${id}-close-relatives-heading`}
            >
              <div className="tree-people-list__section-heading">
                <h2 id={`${id}-close-relatives-heading`}>Người thân gần</h2>
                <span>{closeRelations.length}</span>
              </div>
              {closeRelations.length > 0 ? (
                closeRelations.map((relation) =>
                  renderPersonRow(relation.person, relation.label),
                )
              ) : (
                <p className="tree-people-list__empty">Chưa có quan hệ trực tiếp để hiển thị.</p>
              )}
            </section>

            <section
              className="tree-people-list__group"
              role="region"
              aria-labelledby={`${id}-other-members-heading`}
            >
              <div className="tree-people-list__section-heading">
                <h2 id={`${id}-other-members-heading`}>Các thành viên khác</h2>
                <span>{others.length}</span>
              </div>
              {others.map((person) => renderPersonRow(person))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
