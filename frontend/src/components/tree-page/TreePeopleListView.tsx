import { useState } from "react";
import { Person, Address, addressLabel } from "@/lib/graph";
import { filterWorkspacePeople } from "@/lib/tree-workspace/people";
import { trackUxEvent, getUxViewportClass } from "@/lib/analytics/uxEvents";

export interface TreePeopleListViewProps {
  persons: Person[];
  addresses: Map<string, Address>;
  egoId: string;
  selectedId: string | null;
  onSelectPerson: (id: string) => void;
  onChangeEgo: (id: string) => void;
  addressLoading?: boolean;
}

export function TreePeopleListView({
  persons,
  addresses,
  egoId,
  selectedId,
  onSelectPerson,
  onChangeEgo,
  addressLoading,
}: TreePeopleListViewProps) {
  const [query, setQuery] = useState("");
  const filtered = filterWorkspacePeople(persons, addresses, query);
  const viewpointPerson = persons.find((p) => p.id === egoId);

  return (
    <div className="tree-people-list" style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Danh sách thành viên</h2>
          {viewpointPerson && (
            <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "0.875rem" }}>
              Đang xem từ {viewpointPerson.displayName}
            </p>
          )}
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          className="field"
          placeholder="Tìm kiếm theo tên hoặc vai vế..."
          aria-label="Tìm kiếm thành viên"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            if (query === "" && val !== "") {
              trackUxEvent("ux_core_flow_start", {
                flow: "find_person",
                surface: "workspace_list",
                viewportClass: getUxViewportClass(),
                accessRole: "unknown",
                outcome: "started",
              });
            }
            setQuery(val);
          }}
          style={{ width: "100%", maxWidth: "400px" }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {filtered.map((p) => {
          const address = addresses.get(p.id);
          const isSelected = selectedId === p.id;
          return (
            <div
              key={p.id}
              className={`surface-card ${isSelected ? "selected" : ""}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: isSelected ? "2px solid var(--color-brand)" : "1px solid var(--color-hairline)",
                padding: "0.5rem 1rem",
                gap: "1rem",
              }}
            >
               <button
                type="button"
                onClick={() => {
                  trackUxEvent("ux_core_flow_complete", {
                    flow: "find_person",
                    surface: "workspace_list",
                    viewportClass: getUxViewportClass(),
                    accessRole: "unknown",
                    outcome: "completed",
                  });
                  onSelectPerson(p.id);
                }}
                className="focus-visible-ring"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  padding: "0.5rem 0",
                  cursor: "pointer",
                  color: "inherit",
                  fontFamily: "inherit",
                }}
                aria-label={`Chọn ${p.displayName}`}
              >
                <h3 style={{ margin: 0, fontSize: "1rem" }}>{p.displayName}</h3>
                {address && (
                  <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "0.875rem" }}>
                    {addressLabel(address)}
                  </p>
                )}
              </button>
              <div>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    trackUxEvent("ux_core_flow_complete", {
                      flow: "change_viewpoint",
                      surface: "workspace_list",
                      viewportClass: getUxViewportClass(),
                      accessRole: "unknown",
                      outcome: "completed",
                    });
                    onChangeEgo(p.id);
                  }}
                  disabled={addressLoading || p.id === egoId}
                >
                  {p.id === egoId ? "Đang là góc nhìn" : "Đổi người làm góc nhìn"}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--color-muted)", marginTop: "2rem" }}>
            Không tìm thấy thành viên nào.
          </p>
        )}
      </div>
    </div>
  );
}
