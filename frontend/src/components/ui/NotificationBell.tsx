"use client";

import { useEffect, useState, useRef } from "react";
import { getReminders, markReminderAsRead, deleteReminder, type InAppReminder } from "@/lib/persons";
import { BellIcon, TrashIcon } from "@/components/ui/Icons";

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const [reminders, setReminders] = useState<InAppReminder[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReminders = () => {
    setLoading(true);
    getReminders()
      .then((data) => {
        setReminders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load reminders:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReminders();
    // Poll every 60 seconds
    const interval = setInterval(fetchReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = reminders.filter((r) => !r.isRead).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markReminderAsRead(id);
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isRead: true } : r))
      );
    } catch (err) {
      console.error("Failed to mark reminder as read:", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: "1.25rem",
          position: "relative",
          padding: "0.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-muted)",
          transition: "color 0.2s"
        }}
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <BellIcon size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              background: "var(--color-danger, #ef4444)",
              color: "#fff",
              borderRadius: "50%",
              minWidth: "16px",
              height: "16px",
              fontSize: "0.6875rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 0 0 2px var(--color-background)"
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: align === "right" ? 0 : "auto",
            left: align === "left" ? 0 : "auto",
            marginTop: "0.5rem",
            width: "320px",
            background: "var(--color-surface-card)",
            color: "var(--color-fg)",
            border: "1px solid var(--color-hairline)",
            borderRadius: "12px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.12)",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--color-hairline)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ fontWeight: "600", fontSize: "0.875rem" }}>Thông báo dòng họ</span>
            {unreadCount > 0 && (
              <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                {unreadCount} chưa đọc
              </span>
            )}
          </div>

          <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {loading && reminders.length === 0 ? (
              <p style={{ padding: "2rem", textAlign: "center", color: "var(--color-muted)", margin: 0, fontSize: "0.875rem" }}>
                Đang tải...
              </p>
            ) : reminders.length === 0 ? (
              <p style={{ padding: "2rem", textAlign: "center", color: "var(--color-muted)", margin: 0, fontSize: "0.875rem" }}>
                Không có thông báo nào.
              </p>
            ) : (
              reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid var(--color-hairline)",
                    background: reminder.isRead ? "transparent" : "var(--color-surface-strong)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    position: "relative",
                    transition: "background-color 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{
                      fontWeight: reminder.isRead ? "500" : "600",
                      fontSize: "0.875rem",
                      color: reminder.isRead ? "var(--color-muted)" : "inherit"
                    }}>
                      {reminder.title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(reminder.id, e)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        color: "var(--color-muted)",
                        padding: "0.125rem",
                        display: "flex",
                        alignItems: "center"
                      }}
                      title="Xóa thông báo"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: "0.8125rem",
                    color: "var(--color-muted)",
                    lineHeight: "1.3"
                  }}>
                    {reminder.content}
                  </p>
                  
                  {!reminder.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(reminder.id, e)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--color-accent)",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        padding: 0,
                        cursor: "pointer",
                        marginTop: "0.25rem",
                        alignSelf: "flex-start"
                      }}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
