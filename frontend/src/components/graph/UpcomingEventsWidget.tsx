"use client";

import { useEffect, useState } from "react";
import { getUpcomingEvents, type UpcomingEvent } from "@/lib/persons";
import { Skeleton } from "@/components/ui/Skeleton";

interface UpcomingEventsWidgetProps {
  treeId?: string;
  loadEvents?: (treeId: string) => Promise<UpcomingEvent[]>;
}

export function UpcomingEventsWidget({
  treeId,
  loadEvents = getUpcomingEvents,
}: UpcomingEventsWidgetProps) {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!treeId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    loadEvents(treeId)
      .then((data) => {
        if (active) {
          setEvents(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          console.error("Failed to load upcoming events.");
          setError("Không thể tải danh sách ngày giỗ.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadEvents, treeId]);

  if (loading) {
    return (
      <div className="surface-card side-panel" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h3 className="side-panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>🕯️</span> Ngày giỗ sắp tới
        </h3>
        <Skeleton style={{ height: "40px", borderRadius: "6px" }} />
        <Skeleton style={{ height: "40px", borderRadius: "6px" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card side-panel">
        <h3 className="side-panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>🕯️</span> Ngày giỗ sắp tới
        </h3>
        <p style={{ color: "var(--color-danger)", fontSize: "0.875rem", margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="surface-card side-panel" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <h3 className="side-panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
        <span>🕯️</span> Ngày giỗ trong 30 ngày tới
      </h3>
      {events.length === 0 ? (
        <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", margin: 0, textAlign: "center", padding: "1rem 0" }}>
          Không có ngày giỗ nào trong 30 ngày tới.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {events.map((event) => {
            const isToday = event.daysRemaining === 0;
            const isTomorrow = event.daysRemaining === 1;
            
            // Premium relative tag styling
            let badgeBg = "rgba(255, 255, 255, 0.05)";
            let badgeColor = "var(--color-muted)";
            let badgeText = `Còn ${event.daysRemaining} ngày`;
            
            if (isToday) {
              badgeBg = "var(--color-danger)";
              badgeColor = "#fff";
              badgeText = "Hôm nay";
            } else if (isTomorrow) {
              badgeBg = "var(--color-accent)";
              badgeColor = "#fff";
              badgeText = "Ngày mai";
            } else if (event.daysRemaining <= 3) {
              badgeBg = "rgba(var(--color-accent-rgb), 0.2)";
              badgeColor = "var(--color-accent)";
            }

            return (
              <li
                key={event.personId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--color-hairline)",
                  background: isToday ? "rgba(239, 68, 68, 0.05)" : "transparent",
                  transition: "background-color 0.2s"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                  <span style={{ fontWeight: "600", fontSize: "0.9375rem" }}>
                    {event.displayName}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                    {event.originalDate}
                  </span>
                </div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "4px",
                  background: badgeBg,
                  color: badgeColor
                }}>
                  {badgeText}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
