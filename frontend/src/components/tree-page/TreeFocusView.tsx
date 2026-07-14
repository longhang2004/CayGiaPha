import { Person, Relationship, Address, addressLabel } from "@/lib/graph";
import { getFocusRelations } from "@/lib/tree-workspace/people";
import { trackUxEvent, getUxViewportClass } from "@/lib/analytics/uxEvents";

export interface TreeFocusViewProps {
  persons: Person[];
  relationships: Relationship[];
  addresses: Map<string, Address>;
  egoId: string;
  selectedId: string | null;
  onSelectPerson: (id: string) => void;
  onChangeEgo: (id: string) => void;
  addressLoading?: boolean;
}

export function TreeFocusView({
  persons,
  relationships,
  addresses,
  egoId,
  selectedId,
  onSelectPerson,
  onChangeEgo,
  addressLoading,
}: TreeFocusViewProps) {
  const targetPersonId = selectedId || egoId;
  const targetPerson = persons.find((p) => p.id === targetPersonId);
  const viewpointPerson = persons.find((p) => p.id === egoId);

  if (!targetPerson) {
    return null;
  }

  const relations = getFocusRelations(targetPerson.id, persons, relationships, addresses);
  const targetAddress = addresses.get(targetPerson.id);

  return (
    <div className="tree-focus-view" style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1rem", overflowY: "auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{targetPerson.displayName}</h2>
        {targetAddress && (
          <p style={{ margin: 0, color: "var(--color-muted)" }}>
            {addressLabel(targetAddress)}
          </p>
        )}

        {viewpointPerson && (
          <p style={{ margin: "0.5rem 0 0", color: "var(--color-muted)", fontSize: "0.875rem" }}>
            Đang xem từ {viewpointPerson.displayName}
          </p>
        )}

        <div style={{ marginTop: "1rem" }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              trackUxEvent("ux_core_flow_complete", {
                flow: "change_viewpoint",
                surface: "workspace_focus",
                viewportClass: getUxViewportClass(),
                accessRole: "unknown",
                outcome: "completed",
              });
              onChangeEgo(targetPerson.id);
            }}
            disabled={addressLoading || targetPerson.id === egoId}
          >
            {targetPerson.id === egoId ? "Đang là góc nhìn" : "Đổi người làm góc nhìn"}
          </button>
        </div>
      </div>

      <h3 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Quan hệ trực tiếp</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {relations.map((rel) => {
          return (
            <button
              key={rel.relationshipId + rel.person.id}
              type="button"
              className="surface-card focus-visible-ring"
              style={{
                padding: "1rem",
                cursor: "pointer",
                border: "1px solid var(--color-hairline)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                textAlign: "left",
                background: "transparent",
                color: "inherit",
                fontFamily: "inherit",
                width: "100%",
              }}
              onClick={() => {
                trackUxEvent("ux_core_flow_complete", {
                  flow: "find_person",
                  surface: "workspace_focus",
                  viewportClass: getUxViewportClass(),
                  accessRole: "unknown",
                  outcome: "completed",
                });
                onSelectPerson(rel.person.id);
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem" }}>{rel.person.displayName}</h4>
                <p style={{ margin: 0, color: "var(--color-brand)", fontSize: "0.875rem", fontWeight: 600 }}>{rel.label}</p>
                {rel.address && (
                  <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "0.875rem" }}>
                    Xưng hô: {addressLabel(rel.address)}
                  </p>
                )}
              </div>
            </button>
          );
        })}
        {relations.length === 0 && (
          <p style={{ color: "var(--color-muted)" }}>Chưa có thông tin quan hệ trực tiếp.</p>
        )}
      </div>
    </div>
  );
}
