import { Person, Address, Relationship, TreeAccessRole, addressLabel } from "@/lib/graph";
import { getFocusRelations } from "@/lib/tree-workspace/people";
import { ChevronRightIcon } from "@/components/ui/Icons";
import { trackUxEvent, getUxAccessRole, getUxViewportClass } from "@/lib/analytics/uxEvents";

export interface TreePeopleListViewProps {
  persons: Person[];
  relationships: Relationship[];
  addresses: Map<string, Address>;
  egoId: string;
  selectedId: string | null;
  onSelectPerson: (id: string) => void;
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
  const closeRelations = getFocusRelations(egoId, persons, relationships, addresses)
    .filter((relation) => ["father", "mother", "spouse", "child"].includes(relation.kind));
  const closeIds = new Set(closeRelations.map((relation) => relation.person.id));
  const others = persons.filter((person) => !closeIds.has(person.id));

  const handleSelect = (person: Person) => {
    trackUxEvent("ux_core_flow_complete", {
      flow: "find_person",
      surface: "workspace_list",
      viewportClass: getUxViewportClass(),
      accessRole: getUxAccessRole(accessRole),
      outcome: "completed",
    });
    onSelectPerson(person.id);
  };

  const renderPersonRow = (person: Person, relationshipLabel?: string) => {
    const address = addresses.get(person.id);
    const isSelected = selectedId === person.id;
    return (
      <button
        key={person.id}
        type="button"
        className="tree-people-list__row focus-visible-ring"
        data-selected={isSelected ? "true" : undefined}
        aria-pressed={isSelected}
        aria-label={`Chọn ${person.displayName}`}
        onClick={() => handleSelect(person)}
      >
        <span className={`tree-people-list__avatar tree-people-list__avatar--${person.gender ?? "unknown"}`} aria-hidden="true">
          {person.displayName.trim().charAt(0).toLocaleUpperCase("vi") || "?"}
        </span>
        <span className="tree-people-list__identity">
          <strong>{person.displayName}</strong>
          <span>{relationshipLabel ?? (address ? addressLabel(address) : "Thành viên trong cây")}</span>
        </span>
        <span className="tree-people-list__chevron" aria-hidden="true"><ChevronRightIcon size={20} /></span>
      </button>
    );
  };

  return (
    <div className="tree-people-list">
      <section className="tree-people-list__group" role="region" aria-labelledby="close-relatives-heading">
        <div className="tree-people-list__section-heading">
          <h2 id="close-relatives-heading">Người thân gần</h2>
          <span>{closeRelations.length}</span>
        </div>
        {closeRelations.length > 0 ? closeRelations.map((relation) => renderPersonRow(relation.person, relation.label)) : (
          <p className="tree-people-list__empty">Chưa có quan hệ trực tiếp để hiển thị.</p>
        )}
      </section>

      <section className="tree-people-list__group" role="region" aria-labelledby="other-members-heading">
        <div className="tree-people-list__section-heading">
          <h2 id="other-members-heading">Các thành viên khác</h2>
          <span>{others.length}</span>
        </div>
        {others.map((person) => renderPersonRow(person))}
      </section>
    </div>
  );
}
