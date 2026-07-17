/**
 * Viewpoint (ego) selector. Changing the selection asks the parent to switch
 * the viewpoint, which triggers a re-fetch of every node's address
 * (Requirements 10.1, 10.2).
 */

import type { ChangeEvent } from "react";
import type { Person } from "@/lib/graph";

export interface ViewpointSelectorProps {
  persons: Person[];
  egoId: string;
  onChange: (egoId: string) => void;
  disabled?: boolean;
}

export function ViewpointSelector({
  persons,
  egoId,
  onChange,
  disabled,
}: ViewpointSelectorProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value);
  }

  return (
    <div className="viewpoint-selector">
      <label htmlFor="viewpoint-select">Xét vai vế theo</label>
      <select
        id="viewpoint-select"
        value={egoId}
        onChange={handleChange}
        disabled={disabled}
      >
        {persons.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
