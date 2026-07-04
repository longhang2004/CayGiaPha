"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";

interface AdminFeedbackActionsProps {
  feedbackId: string;
  currentStatus: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Mới",
  reviewed: "Đã xem",
  resolved: "Đã xử lý",
};

export function AdminFeedbackActions({
  feedbackId,
  currentStatus,
}: AdminFeedbackActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: string) {
    setSaving(nextStatus);
    setError("");
    try {
      await api.patch(`/admin/feedback/${feedbackId}`, { status: nextStatus });
      setStatus(nextStatus);
    } catch {
      setError("Không thể cập nhật trạng thái.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div className="admin-feedback-actions" aria-label="Cập nhật trạng thái feedback">
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={value === status ? "btn" : "btn btn-secondary"}
            disabled={saving !== null || value === status}
            onClick={() => updateStatus(value)}
          >
            {saving === value ? "Đang lưu..." : label}
          </button>
        ))}
      </div>
      {error && (
        <p className="field-error" role="alert" style={{ marginTop: "0.5rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
