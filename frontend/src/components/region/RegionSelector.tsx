"use client";

import { useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { REGION_OPTIONS, setRegion, type Region } from "@/lib/region";

/**
 * Region setting control (task 10.4, Requirement 9.5).
 *
 * A select bound to PATCH /trees/{treeId}/region. Choosing Bắc/Trung/Nam
 * immediately persists the new region; every Form_Of_Address computed after the
 * change uses it (9.5). A rejected change (invalid value) is surfaced and the
 * select reverts to the previously stored region (9.6).
 */

interface RegionSelectorProps {
  treeId: string;
  /** The tree's current stored region. */
  region: Region;
  onChange?: (region: Region) => void;
}

export function RegionSelector({ treeId, region, onChange }: RegionSelectorProps) {
  const [value, setValue] = useState<Region>(region);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleChange(next: Region) {
    const previous = value;
    setValue(next);
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const result = await setRegion(treeId, next);
      setValue(result.region);
      setSaved(true);
      onChange?.(result.region);
    } catch (err) {
      // Reject leaves the previously stored region unchanged (9.6).
      setValue(previous);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Không thể đổi vùng. Vui lòng thử lại.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label htmlFor="region-select">Vùng phương ngữ</label>
      <select
        id="region-select"
        value={value}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value as Region)}
      >
        {REGION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <span role="alert" data-testid="region-error">
          {error}
        </span>
      ) : null}
      {saved ? (
        <span role="status" data-testid="region-saved">
          Đã lưu vùng.
        </span>
      ) : null}
    </div>
  );
}
